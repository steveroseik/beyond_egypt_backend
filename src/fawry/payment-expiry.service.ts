import { Injectable, OnModuleInit } from '@nestjs/common';
import { CampVariant } from 'src/camp-variant/entities/camp-variant.entity';
import { RegistrationPayment } from 'src/registration-payment/entities/registration-payment.entity';
import { RegistrationReserve } from 'src/registration-reserve/entities/registration-reserve.entity';
import { PaymentMethod, PaymentStatus } from 'support/enums';
import { DataSource, In } from 'typeorm';
import * as moment from 'moment-timezone';

@Injectable()
export class PaymentExpiryService implements OnModuleInit {
  private readonly timeoutDuration = 11 * 60 * 1000; // 11 minutes

  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit() {
    console.log('Restoring pending Fawry payments...');

    const now = new Date();

    const payments = await this.dataSource
      .getRepository(RegistrationPayment)
      .find({
        where: {
          status: PaymentStatus.pending,
          paymentMethod: PaymentMethod.fawry, // Ensure it's a Fawry payment
        },
      });

    for (const payment of payments) {
      const createdAt = new Date(payment.createdAt);
      const elapsedTime = moment().tz('Africa/Cairo').diff(createdAt);
      const remainingTime = this.timeoutDuration - elapsedTime;

      if (remainingTime > 0) {
        console.log(
          `Restoring timeout for payment ID ${payment.id} with remaining time: ${remainingTime / 1000} seconds`,
        );
        this.setPaymentTimeout(payment.id, remainingTime);
      } else {
        console.log(
          `Payment ID ${payment.id} already expired. Processing expiration now...`,
        );
        await this.expirePayment(payment.id);
      }
    }
  }

  private setPaymentTimeout(paymentId: number, timeout: number) {
    setTimeout(() => this.expirePayment(paymentId), timeout);
  }

  private async expirePayment(paymentId: number) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const payment = await queryRunner.manager.findOne(RegistrationPayment, {
        where: { id: paymentId },
      });

      if (!payment) {
        throw new Error(`Payment ${paymentId} not found`);
      }

      if (payment.status !== PaymentStatus.pending) {
        console.log(`Payment ${paymentId} already processed.`);
        await queryRunner.rollbackTransaction();
        return;
      }

      await queryRunner.manager.update(
        RegistrationPayment,
        { id: paymentId },
        { status: PaymentStatus.expired },
      );

      const reserves = await queryRunner.manager.find(RegistrationReserve, {
        where: { campRegistrationId: payment.campRegistrationId },
      });

      if (reserves.length) {
        const campVariantIds = reserves.map((reserve) => reserve.campVariantId);

        // Lock camp variants
        await queryRunner.manager.find(CampVariant, {
          where: { id: In(campVariantIds) },
          lock: { mode: 'pessimistic_write' },
        });

        for (const reserve of reserves) {
          const update = await queryRunner.manager.update(
            CampVariant,
            { id: reserve.campVariantId },
            { remainingCapacity: () => `remainingCapacity + ${reserve.count}` },
          );

          if (update.affected !== 1) {
            throw new Error(
              `Failed to update camp variant capacity for variant ID ${reserve.campVariantId}`,
            );
          }
        }

        await queryRunner.manager.delete(RegistrationReserve, { paymentId });
      }

      await queryRunner.commitTransaction();
      console.log(`Payment ${paymentId} expired and reserves released`);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error(
        `Error processing expiration for payment ${paymentId}:`,
        error,
      );
    } finally {
      queryRunner.release();
    }
  }
}
