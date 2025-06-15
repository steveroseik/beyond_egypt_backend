import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { DataSource, In, QueryRunner } from 'typeorm';
import { FawryReturnDto } from './models/fawry-return.dto';
import {
  cancelPayment,
  generateStatusQuerySignature,
  requestPaymentStatus,
} from './generate/payment.generate';
import { RegistrationPayment } from 'src/registration-payment/entities/registration-payment.entity';
import * as moment from 'moment-timezone';
import {
  CampRegistrationStatus,
  PaymentMethod,
  PaymentStatus,
} from 'support/enums';
import { CampVariant } from 'src/camp-variant/entities/camp-variant.entity';
import { RegistrationReserve } from 'src/registration-reserve/entities/registration-reserve.entity';
import e, { Response } from 'express';
import { PaymentStatusResponse } from './models/payment-status.payload';
import * as dotenv from 'dotenv';
import { generateQueryParams } from 'support/query-params.generator';
import { CampRegistration } from 'src/camp-registration/entities/camp-registration.entity';
import { MailService } from 'src/mail/mail.service';
import { Camp } from 'src/camp/entities/camp.entity';

dotenv.config();

@Injectable()
export class FawryService {
  constructor(
    private dataSource: DataSource,
    private mailService: MailService,
  ) {}

  async handleReturn(query: FawryReturnDto, res: Response) {
    console.log('Fawry Return Query:', query);
    console.table(query);
    console.log('Fawry res');
    console.table(res);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      if (!query.merchantRefNumber) {
        return res.redirect(
          `${process.env.FRONTEND_URL}/payment-failed?message=Payment expired`,
        );
      }
      const payment = await queryRunner.manager.findOne(RegistrationPayment, {
        where: {
          referenceNumber: `${query.merchantRefNumber}`,
        },
        relations: ['campRegistration'],
        lock: { mode: 'pessimistic_write' },
      });

      console.log('PAYMENT', payment);

      if (!payment) {
        throw Error('Payment not found');
      }

      // validate the fawry response
      const response = await this.validatePaymentResponse(
        query,
        payment,
        queryRunner,
        res,
      );

      await queryRunner.commitTransaction();
      return response;
    } catch (e) {
      await queryRunner.rollbackTransaction();
      console.log(e);
      const parameters = {
        success: false,
        message: e.message ?? 'An error occurred',
      };

      await this.dataSource.manager.update(
        RegistrationPayment,
        { referenceNumber: `${query.merchantRefNumber}` },
        { status: PaymentStatus.failed },
      );

      return res.redirect(
        `${process.env.FRONTEND_URL}/payment-failed?${generateQueryParams(parameters)}`,
      );
    } finally {
      await queryRunner.release();
    }
  }

  async expirePayment(payment: RegistrationPayment, queryRunner: QueryRunner) {
    const cancel = await cancelPayment(payment.referenceNumber, 'en-gb');

    const cancelled = cancel?.code === '200';

    await queryRunner.manager.update(
      RegistrationPayment,
      { id: payment.id },
      {
        status: cancelled ? PaymentStatus.expired : PaymentStatus.failed,
      },
    );

    if (cancelled) {
      const reserves = await queryRunner.manager.find(RegistrationReserve, {
        where: { campRegistrationId: payment.campRegistrationId },
        lock: { mode: 'pessimistic_write' },
      });

      if (reserves.length) {
        await queryRunner.manager.delete(RegistrationReserve, {
          paymentId: payment.id,
        });
      }
    }
  }

  async validatePaymentResponse(
    query: FawryReturnDto,
    payment: RegistrationPayment,
    queryRunner: QueryRunner,
    res: Response,
  ) {
    let parameters = {
      success: false,
      networkError: false,
      message: query.statusDescription,
      statusCode: query.statusCode,
      paymentUrl: payment.url,
      expirationDate: payment.expirationDate,
      campRegistrationId: payment.campRegistrationId,
      campId: payment.campRegistration.campId,
    };

    const diff = moment()
      .tz('Africa/Cairo')
      .diff(payment.expirationDate, 'minutes');

    if (query.statusCode !== 200) {
      /// Make it explicit for failed payments
      if (
        payment.status == PaymentStatus.pending &&
        payment.paymentMethod == PaymentMethod.fawry
      ) {
        if (diff > 0) {
          await this.expirePayment(payment, queryRunner);

          return res.redirect(
            `${process.env.FRONTEND_URL}/payment-failed?paymentId=${payment.id}&message=Payment expired`,
          );
        }
      }
      return res.redirect(
        `${process.env.FRONTEND_URL}/payment-failed?${generateQueryParams(parameters)}`,
      );
    }

    const paymentStatus = await requestPaymentStatus(query.merchantRefNumber);

    if (!paymentStatus) {
      parameters.networkError = true;
      return res.redirect(
        `${process.env.FRONTEND_URL}/payment-failed?${generateQueryParams(parameters)}`,
      );
    }

    if (paymentStatus.orderStatus !== 'PAID') {
      if (
        payment.status == PaymentStatus.pending &&
        payment.paymentMethod == PaymentMethod.fawry
      ) {
        if (diff > 0) {
          await this.expirePayment(payment, queryRunner);

          return res.redirect(
            `${process.env.FRONTEND_URL}/payment-failed?paymentId=${payment.id}&message=Payment expired`,
          );
        }
      }

      return res.redirect(
        `${process.env.FRONTEND_URL}/payment-failed?${generateQueryParams(parameters)}`,
      );
    }

    const update = await queryRunner.manager.update(
      RegistrationPayment,
      { id: payment.id },
      {
        fawryReferenceNumber: query.referenceNumber,
        status: PaymentStatus.paid,
      },
    );

    if (update.affected !== 1) {
      throw new Error('Failed to update payment status');
    }

    const updateCampRegistration = await queryRunner.manager.update(
      CampRegistration,
      { id: payment.campRegistrationId },
      {
        status: CampRegistrationStatus.accepted,
        paidAmount: () => `paidAmount + ${payment.amount}`,
      },
    );

    if (payment.status != PaymentStatus.expired) {
      if (updateCampRegistration.affected !== 1) {
        throw new Error('Failed to update camp registration status');
      }

      await queryRunner.manager.delete(RegistrationReserve, {
        campRegistrationId: payment.campRegistrationId,
      });
    } else {
      await this.deductVacancies(payment.campRegistrationId, queryRunner);
    }

    this.mailService.sendCampRegistrationConfirmation(
      payment.campRegistrationId,
    );

    return res.redirect(
      `${process.env.FRONTEND_URL}/payment-success?paymentId=${payment.id}`,
    );
  }

  async deductVacancies(campRegistrationId: number, queryRunner: QueryRunner) {
    const reserves = await queryRunner.manager.find(RegistrationReserve, {
      where: { campRegistrationId },
    });

    if (!reserves?.length) {
      return;
    }

    const variantIds = reserves.map((e) => e.campVariantId);

    await queryRunner.manager.find(CampVariant, {
      where: { id: In(variantIds) },
      lock: { mode: 'pessimistic_write' },
    });

    for (const { campVariantId, count } of reserves) {
      const update = await queryRunner.manager.update(
        CampVariant,
        { id: campVariantId },
        {
          remainingCapacity: () => `remainingCapacity - ${count}`,
        },
      );
      if (update.affected !== 1) {
        throw new Error('Failed to update camp variant capacity');
      }
    }

    // Delete the reserves after deducting vacancies
    const deleteReserves = await queryRunner.manager.delete(
      RegistrationReserve,
      {
        campRegistrationId,
      },
    );
    if (deleteReserves.affected !== reserves.length) {
      throw new Error('Failed to delete all camp reserves');
    }
  }
}
