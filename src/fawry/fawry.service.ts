import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { DataSource, In, QueryRunner } from 'typeorm';
import { FawryReturnDto } from './models/fawry-return.dto';
import {
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

dotenv.config();

@Injectable()
export class FawryService {
  constructor(private dataSource: DataSource) {}

  async handleReturn(query: FawryReturnDto, res: Response) {
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
          referenceNumber: query.merchantRefNumber,
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

      return res.redirect(
        `${process.env.FRONTEND_URL}/payment-failed?${generateQueryParams(parameters)}`,
      );
    } finally {
      await queryRunner.release();
    }
  }

  async expirePayment(payment: RegistrationPayment, queryRunner: QueryRunner) {
    await queryRunner.manager.update(
      RegistrationPayment,
      { id: payment.id },
      {
        status: PaymentStatus.expired,
      },
    );

    const reserves = await queryRunner.manager.find(RegistrationReserve, {
      where: { paymentId: payment.id },
    });

    if (reserves.length) {
      const campVariantIds = reserves.map((reserve) => reserve.campVariantId);

      // Lock the CampVariant records
      await queryRunner.manager.find(CampVariant, {
        where: { id: In(campVariantIds) },
        lock: { mode: 'pessimistic_write' },
      });

      for (const reserve of reserves) {
        const update = await queryRunner.manager.update(
          CampVariant,
          { id: reserve.campVariantId },
          {
            remainingCapacity: () => `remainingCapacity + ${reserve.count}`,
          },
        );
        if (update.affected !== 1) {
          throw new Error('Failed to update camp variant capacity');
        }
      }

      await queryRunner.manager.delete(RegistrationReserve, {
        paymentId: payment.id,
      });
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
        status: PaymentStatus.paid,
      },
    );

    if (update.affected !== 1) {
      throw new Error('Failed to update payment status');
    }

    const updateCampRegistration = await queryRunner.manager.update(
      CampRegistration,
      { id: payment.campRegistrationId },
      { status: CampRegistrationStatus.accepted, toBePaidAmount: null },
    );

    if (payment.status != PaymentStatus.expired) {
      if (updateCampRegistration.affected !== 1) {
        throw new Error('Failed to update camp registration status');
      }

      const releaseReserves = await queryRunner.manager.delete(
        RegistrationReserve,
        { paymentId: payment.id },
      );
    }

    return res.redirect(
      `${process.env.FRONTEND_URL}/payment-success?paymentId=${payment.id}`,
    );
  }
}
