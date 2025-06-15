import { Injectable } from '@nestjs/common';
import { CreateRegistrationPaymentHistoryInput } from './dto/create-registration-payment.input';
import { UpdateRegistrationPaymentHistoryInput } from './dto/update-registration-payment.input';
import { InjectRepository } from '@nestjs/typeorm';
import { RegistrationPayment } from './entities/registration-payment.entity';
import { DataSource, QueryRunner, Repository } from 'typeorm';
import { PaginateRegistrationPaymentsInput } from './dto/paginate-registration-payments.input';
import { buildPaginator } from 'typeorm-cursor-pagination';
import {
  CampRegistrationStatus,
  PaymentAmountFilter,
  PaymentMethod,
  PaymentStatus,
} from 'support/enums';
import {
  cancelPayment,
  requestPaymentStatus,
  requestRefund,
} from 'src/fawry/generate/payment.generate';
import { RegistrationReserve } from 'src/registration-reserve/entities/registration-reserve.entity';
import { CampRegistration } from 'src/camp-registration/entities/camp-registration.entity';
import { getSumOfPaidAmounts } from 'support/helpers/calculate-sum-of-paid';
import { moneyFixation } from 'support/constants';
import { CampVariantRegistration } from 'src/camp-variant-registration/entities/camp-variant-registration.entity';
import { CampVariant } from 'src/camp-variant/entities/camp-variant.entity';
import moment from 'moment-timezone';
import { query } from 'express';

@Injectable()
export class RegistrationPaymentHistoryService {
  constructor(
    @InjectRepository(RegistrationPayment)
    private repo: Repository<RegistrationPayment>,
    private dataSource: DataSource,
  ) {}

  create(
    createRegistrationPaymentHistoryInput: CreateRegistrationPaymentHistoryInput,
  ) {
    return 'This action adds a new registrationPaymentHistory';
  }

  findAll() {
    return `This action returns all registrationPaymentHistory`;
  }

  findOne(id: number) {
    return `This action returns a #${id} registrationPaymentHistory`;
  }

  update(
    id: number,
    updateRegistrationPaymentHistoryInput: UpdateRegistrationPaymentHistoryInput,
  ) {
    return `This action updates a #${id} registrationPaymentHistory`;
  }

  remove(id: number) {
    return `This action removes a #${id} registrationPaymentHistory`;
  }

  paginate(input: PaginateRegistrationPaymentsInput) {
    try {
      const queryBuilder = this.repo.createQueryBuilder('registrationPayment');

      if (input.userId) {
        queryBuilder
          .innerJoinAndSelect(
            'registrationPayment.campRegistration',
            'campRegistration',
          )
          .andWhere('campRegistration.userId = :userId', {
            userId: input.userId,
          });
      }

      if (input.campRegistrationId) {
        queryBuilder.andWhere(
          'registrationPayment.campRegistrationId = :campRegistrationId',
          { campRegistrationId: input.campRegistrationId },
        );
      }

      if (input.paymentMethods?.length) {
        queryBuilder.andWhere(
          'registrationPayment.paymentMethod IN (:...paymentMethods)',
          {
            paymentMethods: input.paymentMethods,
          },
        );
      }

      if (input.statuses?.length) {
        queryBuilder.andWhere('registrationPayment.status IN (:...statuses)', {
          statuses: input.statuses,
        });
      }

      if (input.amountFilter) {
        if (input.amountFilter == PaymentAmountFilter.greaterThanZero) {
          queryBuilder.andWhere('registrationPayment.amount > 0');
        } else {
          queryBuilder.andWhere('registrationPayment.amount < 0');
        }
      }

      if (input.search) {
        queryBuilder.andWhere(
          'registrationPayment.referenceNumber LIKE :search OR registrationPayment.amount LIKE :search OR registrationPayment.url LIKE :search',
          {
            search: `%${input.search}%`,
          },
        );
      }

      const paginator = buildPaginator({
        entity: RegistrationPayment,
        paginationKeys: ['createdAt', 'id'],
        alias: 'registrationPayment',
        query: {
          ...input,
          order: input.isAsc ? 'ASC' : 'DESC',
        },
      });

      return paginator.paginate(queryBuilder);
    } catch (e) {
      console.log(e);
      return {
        success: false,
        message: e ?? 'Error while paginating registration payments',
      };
    }
  }

  /**
   * Revalidates a registration payment by verifying its status with the external payment provider (Fawry),
   * updating the payment and related registration records, handling refunds if necessary, and managing
   * associated reserves and camp variant capacities.
   *
   * This method performs the following steps:
   * 1. Starts a database transaction and locks relevant rows for consistency.
   * 2. Fetches the payment and associated camp registration, locking them for update.
   * 3. Checks if the payment is already paid or not using the Fawry payment method.
   * 4. Validates the payment status with the external provider.
   * 5. Updates the payment status to 'paid' if validation succeeds.
   * 6. If the paid amount does not match the required amount, processes a refund and creates a new refund record.
   * 7. If the amount is correct, removes any associated reserves and updates camp variant capacities accordingly.
   * 8. Updates the camp registration status and paid amount.
   * 9. Commits the transaction if all steps succeed, or rolls back on error.
   *
   * @param id - The ID of the registration payment to revalidate.
   * @returns An object indicating success or failure, and a message describing the result.
   * @throws Will throw an error if any step fails, including payment not found, invalid status, refund failure, or database update issues.
   */
  async revalidate(id: number) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let refunded = false;

    try {
      const payment = await queryRunner.manager.findOne(RegistrationPayment, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!payment) {
        throw new Error('Payment not found');
      }

      // Lock the related campRegistration row
      payment.campRegistration = await queryRunner.manager.findOne(
        CampRegistration,
        {
          where: { id: payment.campRegistrationId },
          lock: { mode: 'pessimistic_write' },
        },
      );

      if (!payment.campRegistration) {
        throw new Error('Camp registration not found');
      }

      payment.campRegistration.campVariantRegistrations =
        await queryRunner.manager.find(CampVariantRegistration, {
          where: { campRegistrationId: payment.campRegistration.id },
          lock: { mode: 'pessimistic_write' },
        });

      if (payment.status === PaymentStatus.paid) {
        throw new Error('Payment is already paid');
      }

      if (payment.paymentMethod !== PaymentMethod.fawry) {
        throw new Error('Payment is not fawry');
      }

      const refNum = parseInt(payment.referenceNumber ?? '');

      if (isNaN(refNum)) {
        throw new Error('Invalid reference number');
      }

      const validateResponse = await requestPaymentStatus(refNum);

      if (!validateResponse || validateResponse.orderStatus !== 'PAID') {
        // check if payment expired, then cancel payment
        const now = moment().tz('Africa/Cairo');
        if (!now.isBefore(payment.expirationDate)) {
          // then expire
          await this.cancelFawryPayment(payment, queryRunner);
        } else {
          throw new Error(`Payment validation failed`);
        }
      }

      const updatePayment = await queryRunner.manager.update(
        RegistrationPayment,
        { id: payment.id },
        {
          status: PaymentStatus.paid,
          fawryReferenceNumber: validateResponse.fawryRefNumber,
        },
      );

      if (updatePayment.affected === 0) {
        throw new Error('Failed to update payment status');
      }

      const amountToBePaid = payment.campRegistration.amountDifference();
      const rightAmount = amountToBePaid.eq(payment.amount);
      if (!rightAmount) {
        refunded = true;

        const refund = await requestRefund({
          fawryReferenceNumber: validateResponse.fawryRefNumber,
          refundAmount: payment.amount.toFixed(moneyFixation),
          refundReason: 'Unused payment',
        });

        if (refund.statusCode !== 200) {
          throw new Error(
            'Failed to refund unused payment: ' + refund.statusDescription ||
              'Unknown error',
          );
        }

        const newPayment = await queryRunner.manager.insert(
          RegistrationPayment,
          {
            campRegistrationId: payment.campRegistrationId,
            amount: payment.amount,
            paymentMethod: payment.paymentMethod,
            status: PaymentStatus.paid,
            parentId: payment.id,
          },
        );

        if (!newPayment.identifiers || newPayment.identifiers.length === 0) {
          throw new Error('Failed to create new refund record');
        }
      } else {
        const reserves = await queryRunner.manager.find(RegistrationReserve, {
          where: { campRegistrationId: payment.campRegistrationId },
          lock: { mode: 'pessimistic_write' },
        });

        if (reserves?.length) {
          const deleteReserves = await queryRunner.manager.delete(
            RegistrationReserve,
            reserves.map((reserve) => reserve.id),
          );

          if (deleteReserves.affected !== reserves.length) {
            throw new Error('Failed to delete reserves');
          }

          const vacancies: Map<number, number> = new Map();
          reserves.forEach((variant) => {
            const currentVacancy = vacancies.get(variant.campVariantId) || 0;
            vacancies.set(
              variant.campVariantId,
              currentVacancy + variant.count,
            );
          });

          for (const [campVariantId, count] of vacancies.entries()) {
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
        }
      }

      const paidAmount = await getSumOfPaidAmounts(
        payment.campRegistrationId,
        queryRunner,
      );

      const updateCampRegistration = await queryRunner.manager.update(
        CampRegistration,
        { id: payment.campRegistrationId },
        {
          status: refunded ? undefined : CampRegistrationStatus.accepted,
          paidAmount,
        },
      );

      if (updateCampRegistration.affected !== 1) {
        throw new Error('Failed to update camp registration status');
      }

      await queryRunner.commitTransaction();
      return { success: true, message: 'Payment validated successfully' };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.log(error);
      return { success: false, message: error.message };
    } finally {
      await queryRunner.release();
    }
  }

  async cancelFawryPayment(
    payment: RegistrationPayment,
    queryRunner: QueryRunner,
  ) {
    const cancelResponse = await cancelPayment(
      payment.referenceNumber,
      'en-gb',
    );

    await queryRunner.manager.update(
      RegistrationPayment,
      { id: payment.id },
      {
        status:
          cancelResponse?.code !== '200'
            ? PaymentStatus.failed
            : PaymentStatus.expired,
      },
    );
  }
}
