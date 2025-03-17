import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { DataSource, In, QueryRunner } from 'typeorm';
import { FawryReturnDto } from './models/fawry-return.dto';
import { generateStatusQuerySignature } from './generate/payment.generate';
import { RegistrationPayment } from 'src/registration-payment/entities/registration-payment.entity';
import * as moment from 'moment-timezone';
import { PaymentMethod, PaymentStatus } from 'support/enums';
import { CampVariant } from 'src/camp-variant/entities/camp-variant.entity';
import { RegistrationReserve } from 'src/registration-reserve/entities/registration-reserve.entity';
import e, { Response } from 'express';
import { PaymentStatusResponse } from './models/payment-status.payload';
import * as dotenv from 'dotenv';
import { generateQueryParams } from 'support/query-params.generator';

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
      const signature = generateStatusQuerySignature(query.merchantRefNumber);
      console.log('SIGNATURE', signature);
      if (signature !== query.signature) {
        return res.redirect(`${process.env.FRONTEND_URL}/payment-failed`);
      }
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

  validatePaymentResponse(response: PaymentStatusResponse): boolean {
    // Check that the order status indicates payment was successful.
    if (response.orderStatus !== 'PAID') {
      /// redirect to failed page
    }

    // Check that the payment amount matches the order amount.
    if (response.paymentAmount !== response.orderAmount) {
      throw new HttpException(
        {
          success: false,
          message: `Payment amount (${response.paymentAmount}) does not match order amount (${response.orderAmount}).`,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Optionally, verify that fees are within expected bounds.
    if (response.fawryFees < 0) {
      throw new HttpException(
        {
          success: false,
          message: `Invalid fee amount: ${response.fawryFees}`,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Ensure order items exist and contain valid data.
    if (!response.orderItems || response.orderItems.length === 0) {
      throw new HttpException(
        {
          success: false,
          message: 'No order items provided in the payment response.',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Additional checks (for example, validating the message signature) can be added here.
    // For example:
    // if (!this.validateMessageSignature(response)) {
    //   throw new HttpException(
    //     { success: false, message: 'Invalid message signature.' },
    //     HttpStatus.BAD_REQUEST,
    //   );
    // }

    // If all checks pass, consider the payment valid.
    return true;
  }
}
