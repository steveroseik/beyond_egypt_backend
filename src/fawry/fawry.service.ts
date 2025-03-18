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
      const payment = await queryRunner.manager.findOne(RegistrationPayment, {
        where: {
          id: query.merchantRefNumber,
        },
        relations: ['campRegistration'],
      });

      console.log('PAYMENT', payment);

      if (!payment) {
        throw Error('Payment not found');
      }

      if (
        payment.status == PaymentStatus.pending &&
        payment.paymentMethod == PaymentMethod.fawry
      ) {
        const diff = moment()
          .tz('Africa/Cairo')
          .diff(payment.expirationDate, 'minutes');

        console.log('DIFF', diff);

        if (diff > 0) {
          await this.expirePayment(payment, queryRunner);
          await queryRunner.commitTransaction();

          return res.redirect(
            `${process.env.FRONTEND_URL}/payment-failed?paymentId=${payment.id}&message=Payment expired`,
          );
        }
      }

      if (query.statusCode !== 200) {
        await queryRunner.commitTransaction();
        const parameters = {
          success: false,
          message: query.statusDescription,
          statusCode: query.statusCode,
          paymentUrl: payment.url,
          expirationDate: payment.expirationDate,
          campRegistrationId: payment.campRegistrationId,
          campId: payment.campRegistration.campId,
        };
        return res.redirect(
          `${process.env.FRONTEND_URL}/payment-failed?${generateQueryParams(parameters)}`,
        );
      }

      // validate the fawry response
      return await this.validatePaymentResponse(
        query,
        payment,
        queryRunner,
        res,
      );
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
    const paymentStatus = await requestPaymentStatus(query.merchantRefNumber);

    if (!paymentStatus) {
      throw new Error('Failed to get payment status');
    }

    if (paymentStatus.orderStatus !== 'PAID') {
      const updateFailed = await queryRunner.manager.update(
        RegistrationPayment,
        { id: payment.id },
        {
          status: PaymentStatus.failed,
        },
      );
      await queryRunner.commitTransaction();

      return res.redirect(
        `${process.env.FRONTEND_URL}/payment-failed?paymentId=${payment.id}&message=Payment failed`,
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
      { status: CampRegistrationStatus.accepted, paid: true },
    );

    if (updateCampRegistration.affected !== 1) {
      throw new Error('Failed to update camp registration status');
    }

    const releaseReserves = await queryRunner.manager.delete(
      RegistrationReserve,
      { paymentId: payment.id },
    );

    await queryRunner.commitTransaction();

    return res.redirect(
      `${process.env.FRONTEND_URL}/payment-success?paymentId=${payment.id}`,
    );
  }
}
