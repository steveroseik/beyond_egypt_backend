import { Injectable } from '@nestjs/common';
import { DataSource, In, QueryRunner } from 'typeorm';
import { FawryReturnDto } from './models/fawry-return.dto';
import { generateStatusQuerySignature } from './generate/payment.generate';
import { RegistrationPayment } from 'src/registration-payment/entities/registration-payment.entity';
import * as moment from 'moment-timezone';
import { PaymentMethod, PaymentStatus } from 'support/enums';
import { CampVariant } from 'src/camp-variant/entities/camp-variant.entity';
import { RegistrationReserve } from 'src/registration-reserve/entities/registration-reserve.entity';
import e from 'express';

@Injectable()
export class FawryService {
  constructor(private dataSource: DataSource) {}

  async handleReturn(query: FawryReturnDto) {
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
        throw new Error('Payment not found');
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

          return {
            success: false,
            message: 'Payment expired',
          };
        }
      }

      if (query.statusCode !== 200) {
        await queryRunner.commitTransaction();
        return {
          success: false,
          message: query.statusDescription,
          statusCode: query.statusCode,
          paymentUrl: payment.url,
          expirationDate: payment.expirationDate,
          campRegistrationId: payment.campRegistrationId,
          campId: payment.campRegistration.campId,
        };
      }

      // validate the fawry response
      const signature = generateStatusQuerySignature(query.merchantRefNumber);
      console.log('SIGNATURE', signature);
      if (signature !== query.signature) {
        throw new Error('Unimplemted yettttt');
      }
    } catch (e) {
      await queryRunner.rollbackTransaction();
      console.log(e);
      return {
        success: false,
        message: e.message,
      };
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
}
