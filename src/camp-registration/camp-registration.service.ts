import { Injectable } from '@nestjs/common';
import { CreateCampRegistrationInput } from './dto/create-camp-registration.input';
import { UpdateCampRegistrationInput } from './dto/update-camp-registration.input';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, QueryRunner, Repository } from 'typeorm';
import { CampRegistration } from './entities/camp-registration.entity';
import {
  CampRegistrationStatus,
  PaymentMethod,
  PaymentStatus,
  UserType,
} from 'support/enums';
import { CampVariantRegistration } from 'src/camp-variant-registration/entities/camp-variant-registration.entity';
import { CreateCampVariantRegistrationInput } from 'src/camp-variant-registration/dto/create-camp-variant-registration.input';
import { User } from 'src/user/entities/user.entity';
import { CampVariant } from 'src/camp-variant/entities/camp-variant.entity';
import e from 'express';
import { on } from 'events';
import { PaginateCampRegistrationsInput } from './dto/paginate-camp-registrations.input';
import { buildPaginator } from 'typeorm-cursor-pagination';
import { ProcessCampRegistration } from './dto/process-camp-registration.input';
import { PaymentPayload } from 'src/fawry/models/payment.payload';
import { RegistrationPayment } from 'src/registration-payment/entities/registration-payment.entity';
import * as moment from 'moment-timezone';
import { generateFawryPaymentUrl } from 'src/fawry/generate/payment.generate';
import { RegistrationReserve } from 'src/registration-reserve/entities/registration-reserve.entity';
import { CreateRegistrationReserveInput } from 'src/registration-reserve/dto/create-registration-reserve.input';

import * as dotenv from 'dotenv';
import { Decimal } from 'support/scalars';
import { moneyFixation } from 'support/constants';
dotenv.config();

@Injectable()
export class CampRegistrationService {
  constructor(
    @InjectRepository(CampRegistration)
    private repo: Repository<CampRegistration>,
    private dataSource: DataSource,
  ) {}

  async create(
    input: CreateCampRegistrationInput,
    type: UserType,
    userId: string,
  ) {
    // validate if there are no incomplete registrations
    const campRegistration = await this.repo.findOne({
      where: {
        parentId: input.parentId,
        campId: input.campId,
        status: CampRegistrationStatus.idle,
      },
    });
    if (campRegistration) {
      return {
        success: false,
        message: 'You have an incomplete registration for this camp',
        data: {
          campRegistrationId: campRegistration.id,
        },
      };
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      if (type == UserType.parent) {
        return await this.handleParentCampCreation(input, queryRunner, userId);
      } else {
        return await this.handleAdminCampRegistration(
          input,
          queryRunner,
          userId,
        );
      }
    } catch (e) {
      queryRunner.rollbackTransaction();
      console.log(e);
      return {
        success: false,
        message: e.message,
      };
    } finally {
      queryRunner.release();
    }
  }

  async handleParentCampCreation(
    input: CreateCampRegistrationInput,
    queryRunner: QueryRunner,
    userId: string,
  ) {
    const campRegistration = await queryRunner.manager.insert(
      CampRegistration,
      {
        campId: input.campId,
        parentId: userId,
      },
    );

    if (campRegistration.raw.affectedRows !== 1) {
      throw new Error('Failed to create camp registration');
    }

    await queryRunner.commitTransaction();

    return {
      success: true,
      message: 'Camp registration created successfully',
      data: {
        campRegistrationId: campRegistration.identifiers[0].id,
      },
    };
  }

  async handleAdminCampRegistration(
    input: CreateCampRegistrationInput,
    queryRunner: QueryRunner,
    userId: string,
  ) {
    if (input.totalPrice) {
      if (!input.campVariantRegistrations?.length) {
        throw new Error('Registration must have at least one week');
      }
    } else if (input.oneDayPrice) {
      if (input.campVariantRegistrations?.length != 1) {
        throw new Error('One day registration must have only one week');
      }
    } else {
      throw new Error('Total price or one day price is required');
    }

    if (!input.paymentMethod) {
      throw new Error('Payment method is required');
    }

    const campRegistration = await queryRunner.manager.insert(
      CampRegistration,
      {
        ...input,
        oneDayPrice: input.oneDayPrice?.toFixed(moneyFixation),
        totalPrice: input.totalPrice?.toFixed(moneyFixation),
      },
    );

    if (campRegistration.raw.affectedRows !== 1) {
      throw new Error('Failed to create camp registration');
    }

    throw new Error('Not implemented kalem steven...');

    // await this.handleCampVariantRegistrations(
    //   input.campVariantRegistrations,
    //   campRegistration.id,
    //   queryRunner,
    // );
  }

  async handleCampVariantRegistrations(
    campVariantRegistrations: CreateCampVariantRegistrationInput[],
    campRegistrationId: number,
    queryRunner: QueryRunner,
  ): Promise<string | null> {
    if (!campVariantRegistrations?.length) {
      return null;
    }

    // store camp variant vacancies needed to be reserved
    let campVariants = new Map<number, number>();

    for (const cvr of campVariantRegistrations) {
      // validate if there are no duplicate registrations
      const existing = campVariantRegistrations.filter(
        (e) =>
          e.childId === cvr.childId && e.campVariantId == cvr.campVariantId,
      );
      if (existing.length > 1) {
        throw new Error('Duplicate camp variant registration');
      }

      // update camp variant count
      if (!campVariants.has(cvr.campVariantId)) {
        campVariants.set(cvr.campVariantId, 1);
      } else {
        campVariants.set(
          cvr.campVariantId,
          campVariants.get(cvr.campVariantId) + 1,
        );
      }
    }

    const campVariantIds = Array.from(campVariants.keys());

    // validate if there are enough vacancies
    const campVariantVacancies = await queryRunner.manager.find(CampVariant, {
      where: { id: In(campVariantIds) },
      lock: { mode: 'pessimistic_write' },
    });

    if (campVariantVacancies.length !== campVariantIds.length) {
      throw new Error('Invalid camp variant reference');
    }

    for (const cv of campVariantVacancies) {
      if (cv.remainingCapacity < campVariants.get(cv.id)) {
        throw new Error(`Not enough vacancies for ${cv.name}`);
      }
    }

    const inserts = await queryRunner.manager.insert(
      CampVariantRegistration,
      campVariantRegistrations.map((e) => ({
        ...e,
        campRegistrationId,
        price: campVariantVacancies.find((cv) => cv.id === e.campVariantId)
          .price,
      })),
    );

    if (inserts.raw.affectedRows !== campVariantRegistrations.length) {
      throw new Error('Failed to insert camp variant registrations');
    }

    return this.calculateCampVariantRegistrationPrice(
      campVariantVacancies,
      campVariants,
    );
  }

  calculateCampVariantRegistrationPrice(
    campVariants: CampVariant[],
    campVariantsCount: Map<number, number>,
  ): string {
    let totalPrice = new Decimal('0');

    for (const [key, count] of campVariantsCount.entries()) {
      const cvr = campVariants.find((e) => e.id === key);
      totalPrice = totalPrice.plus(cvr.price.times(count));
    }

    return totalPrice.toFixed(2);
  }

  findAll() {
    return `This action returns all campRegistration`;
  }

  findOne(id: number) {
    return `This action returns a #${id} campRegistration`;
  }

  async completeCampRegistration(
    input: UpdateCampRegistrationInput,
    userId: string,
    type: UserType,
  ) {
    if (type === UserType.parent) {
      input.parentId = userId;
      if (input.totalPrice || input.oneDayPrice) {
        return {
          success: false,
          message: 'Unauthorized, admin actions done by parent',
        };
      }
    }

    const campRegistration = await this.repo.findOne({
      where: {
        id: input.id,
        ...(input.parentId && { parentId: input.parentId }),
      },
      relations: ['campVariantRegistrations'],
    });

    if (!campRegistration) {
      return {
        success: false,
        message: 'Camp registration not found',
      };
    }

    if (campRegistration.status !== CampRegistrationStatus.idle) {
      return {
        success: false,
        message: 'Camp registration already completed',
      };
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      if (type == UserType.parent) {
        return await this.handleParentCampCompletion(
          input,
          queryRunner,
          userId,
        );
      } else {
        return await this.handleAdminCampCompletion(
          input,
          campRegistration,
          queryRunner,
        );
      }
    } catch (e) {
      await queryRunner.rollbackTransaction();
      console.log(e);
      return {
        success: false,
        message: e.message,
      };
    } finally {
      queryRunner.release();
    }
  }

  async handleParentCampCompletion(
    input: UpdateCampRegistrationInput,
    queryRunner: QueryRunner,
    userId: string,
  ) {
    if (!input.campVariantRegistrations?.length)
      throw new Error('Set at least one week for registration');

    const price = await this.handleCampVariantRegistrations(
      input.campVariantRegistrations,
      input.id,
      queryRunner,
    );

    await queryRunner.manager.update(
      CampRegistration,
      { id: input.id, parentId: userId },
      {
        totalPrice: price,
        paymentMethod: input.paymentMethod,
        oneDayPrice: null,
      },
    );

    await queryRunner.commitTransaction();

    return {
      success: true,
      message: 'Camp registration completed successfully',
      data: {
        totalAmount: price,
      },
    };
  }

  async handleAdminCampCompletion(
    input: UpdateCampRegistrationInput,
    campRegistration: CampRegistration,
    queryRunner: QueryRunner,
  ) {
    // admin only
    if (input.oneDayPrice) {
      if (input.campVariantRegistrations?.length == 1) {
        if (campRegistration.campVariantRegistrations?.length) {
          // delete old camp variants
          const deleted = await queryRunner.manager.delete(
            CampVariantRegistration,
            {
              id: In(
                campRegistration.campVariantRegistrations?.map((e) => e.id),
              ),
            },
          );
          if (
            deleted.affected !==
            campRegistration.campVariantRegistrations?.length
          ) {
            throw Error('Failed to remove old weeks from registration');
          }
        }

        // create new camp variant
        await this.handleCampVariantRegistrations(
          input.campVariantRegistrations,
          campRegistration.id,
          queryRunner,
        );
      } else {
        if (campRegistration.campVariantRegistrations?.length == 1) {
          if (input.campVariantRegistrations?.length > 1) {
            throw new Error('One day registration must have only one week');
          }
        } else {
          if (
            (campRegistration.campVariantRegistrations?.length ?? 0) -
              (input.variantsToDelete?.length ?? 0) !=
            1
          ) {
            throw new Error('One day registration must have only one week');
          } else {
            // delete old camp variants
            const deleted = await queryRunner.manager.delete(
              CampVariantRegistration,
              {
                id: In(input.variantsToDelete),
              },
            );
            if (deleted.affected !== input.variantsToDelete.length) {
              throw Error('Failed to remove old weeks from registration');
            }
          }
          throw new Error('One day registration currently have only one week');
        }
      }

      const updated = await queryRunner.manager.update(
        CampRegistration,
        { id: input.id },
        {
          oneDayPrice: input.oneDayPrice,
          paymentMethod: input.paymentMethod,
          totalPrice: null,
        },
      );

      if (updated.affected !== 1) {
        throw new Error('Failed to update camp registration');
      }

      await queryRunner.commitTransaction();

      return {
        success: true,
        message: 'Camp registration completed successfully',
      };
    } else {
      /// TODO: consider the case where we need to remove old camp variants
      if (input.campVariantRegistrations?.length) {
        const price = await this.handleCampVariantRegistrations(
          input.campVariantRegistrations,
          campRegistration.id,
          queryRunner,
        );

        const updated = await queryRunner.manager.update(
          CampRegistration,
          { id: input.id },
          {
            totalPrice: price,
            paymentMethod: input.paymentMethod,
            oneDayPrice: null,
          },
        );

        if (updated.affected !== 1) {
          throw new Error('Failed to update camp registration');
        }

        await queryRunner.commitTransaction();

        return {
          success: true,
          message: 'Camp registration completed successfully',
        };
      }
    }
  }

  async paginateCampRegistrations(input: PaginateCampRegistrationsInput) {
    const queryBuilder = this.repo.createQueryBuilder('campRegistration');

    if (input.parentIds) {
      queryBuilder.andWhere('campRegistration.parentId IN (:...parentIds)', {
        parentIds: input.parentIds,
      });
    }

    if (input.campIds) {
      queryBuilder.andWhere('campRegistration.campId IN (:...campIds)', {
        campIds: input.campIds,
      });
    }

    const paginator = buildPaginator({
      entity: CampRegistration,
      alias: 'campRegistration',
      paginationKeys: ['createdAt', 'id'],
      query: {
        ...input,
        order: input.isAsc ? 'ASC' : 'DESC',
      },
    });

    return paginator.paginate(queryBuilder);
  }

  async processCampRegistration(
    input: ProcessCampRegistration,
    userId: string,
    userType: UserType,
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const campRegistration = await this.repo.findOne({
        where: { id: input.campRegistrationId },
        relations: ['campVariantRegistrations', 'payments'],
      });

      if (!campRegistration) {
        throw new Error('Camp registration not found or incomplete');
      }

      if (!campRegistration.campVariantRegistrations?.length) {
        throw Error('Incomplete camp, add at least one week');
      }

      if (campRegistration.status !== CampRegistrationStatus.idle) {
        throw new Error('Camp registration already processed');
      }

      //TODO: handle two scenarios
      // first: if payment is secondary and the difference is positive
      // second: if the payment is secondary and the difference is negative

      /// basic case
      /// if this is the first payment

      return await this.handlePayment(
        campRegistration,
        queryRunner,
        userId,
        input.paymentMethod,
      );
    } catch (e) {
      await queryRunner.rollbackTransaction();
      console.log(e);
      return {
        success: false,
        message: e.message,
      };
    } finally {
      queryRunner.release();
    }
  }

  async handlePayment(
    campRegistration: CampRegistration,
    queryRunner: QueryRunner,
    userId: string,
    paymentMethod?: PaymentMethod,
  ) {
    paymentMethod ??= campRegistration.paymentMethod;

    if (!paymentMethod) throw Error('Select a payment method first');

    let successfulPayments: RegistrationPayment[] = [];
    let pendingPayments: RegistrationPayment[] = [];

    if (campRegistration.payments?.length) {
      for (const payment of campRegistration.payments) {
        if (payment.paymentMethod === paymentMethod) {
          if (payment.status === PaymentStatus.paid) {
            successfulPayments.push(payment);
          } else {
            if (payment.status == PaymentStatus.pending) {
              pendingPayments.push(payment);
            }
          }
        }
      }
    }

    if (successfulPayments.length) {
      throw new Error('Camp registration already paid');
    }

    if (pendingPayments.length) {
      if (paymentMethod == PaymentMethod.fawry) {
        const validPayment = pendingPayments.find(
          (e) =>
            moment().tz('Africa/Cairo').diff(e.expirationDate, 'minutes') < 0,
        );
        if (validPayment) {
          return {
            success: true,
            payment: validPayment,
            expiration: validPayment.expirationDate,
          };
        }
      } else {
        throw new Error('Payment already pending');
      }
    }

    const campVariantVacancies = new Map<number, number>();

    for (const variant of campRegistration.campVariantRegistrations) {
      if (campVariantVacancies.has(variant.campVariantId)) {
        campVariantVacancies.set(
          variant.campVariantId,
          campVariantVacancies.get(variant.campVariantId) + 1,
        );
      } else {
        campVariantVacancies.set(variant.campVariantId, 1);
      }
    }

    const campVariantIds = Array.from(campVariantVacancies.keys());

    // validate if there are enough vacancies
    const campVariants = await queryRunner.manager.find(CampVariant, {
      where: { id: In(campVariantIds) },
      lock: { mode: 'pessimistic_write' },
    });

    if (campVariants.length !== campVariantIds.length)
      throw Error('Missing camp variants');

    for (const cv of campVariants) {
      if (campVariantVacancies.get(cv.id) > cv.remainingCapacity) {
        throw new Error(`Not enough vacancies for ${cv.name} (${cv.campId})`);
      }
    }

    switch (paymentMethod) {
      case PaymentMethod.cash:
      case PaymentMethod.instapay:
        return await this.createTemporaryReservation(
          queryRunner,
          campRegistration,
          campVariants,
          campVariantVacancies,
          userId,
          paymentMethod,
        );
      case PaymentMethod.fawry:
        return await this.handleFawryPayment(
          campRegistration,
          campVariants,
          campVariantVacancies,
          queryRunner,
          userId,
        );
    }
  }

  async handleFawryPayment(
    campRegistration: CampRegistration,
    campVariants: CampVariant[],
    campVariantVacancies: Map<number, number>,
    queryRunner: QueryRunner,
    userId: string,
  ) {
    //const find parent
    const parent = await queryRunner.manager.findOne(User, {
      where: { id: campRegistration.parentId },
    });

    if (!parent) {
      throw Error('Failed to find parent');
    }

    /// create payment
    const totalAmount = this.calculateCampVariantRegistrationPrice(
      campVariants,
      campVariantVacancies,
    );

    const payment = await queryRunner.manager.save(RegistrationPayment, {
      campRegistrationId: campRegistration.id,
      amount: totalAmount,
      paymentMethod: PaymentMethod.fawry,
      userId,
    });

    if (!payment) {
      throw Error('Failed to create payment record');
    }

    const tenMinutesFromNow = moment.tz('Africa/Cairo').add(10, 'minute');
    // const tenMinutesFromNow = Date.now() + 10 * 60 * 1000;

    const payloadData: PaymentPayload = {
      merchantRefNum: payment.id.toString(),
      customerProfileId: parent.id,
      customerEmail: parent.email,
      customerMobile: parent.phone,
      customerName: parent.name,
      authCaptureModePayment: false,
      paymentExpiry: `${tenMinutesFromNow.valueOf()}`,
      language: 'en-gb',
      chargeItems: [
        {
          itemId: campRegistration.id.toString(),
          description: 'Camp Registration Payment',
          price: totalAmount,
          quantity: 1,
        },
      ],
      returnUrl: `${process.env.BASE_URL}/web/fawry/return`,
    };

    const paymentUrl = await generateFawryPaymentUrl(payloadData);

    if (!paymentUrl) throw Error('Payment url received empty');

    payment.url = paymentUrl;
    const updatePayment = await queryRunner.manager.update(
      RegistrationPayment,
      { id: payment.id },
      { url: paymentUrl, expirationDate: tenMinutesFromNow.toDate() },
    );

    if (updatePayment.affected == 0) {
      throw Error('Failed to update registration payment');
    }

    /// reserve registrations
    const reservations: CreateRegistrationReserveInput[] = [];
    campVariantVacancies.forEach((value, key) => {
      reservations.push({
        campRegistrationId: campRegistration.id,
        campVariantId: key,
        count: value,
        paymentId: payment.id,
        expirationDate: tenMinutesFromNow.toDate(),
        userId,
      });
    });

    const reserve = await queryRunner.manager.insert(
      RegistrationReserve,
      reservations,
    );

    if (reserve.raw.affectedRows !== reservations.length)
      throw Error('Failed to reserve registrations');

    // deduct vacancies
    for (const [key, value] of campVariantVacancies) {
      const update = await queryRunner.manager.update(
        CampVariant,
        { id: key },
        { remainingCapacity: () => `remainingCapacity - ${value}` },
      );
      if (update.affected !== 1) {
        const campVariant = campVariants.find((e) => e.id == key);
        throw Error(
          `Failed to deduct capacity from ${campVariant.name} (${campRegistration.id})`,
        );
      }
    }

    await queryRunner.commitTransaction();
    this.setPaymentTimoout(payment.id);
    return {
      success: true,
      payment: payment,
      expiration: tenMinutesFromNow,
    };
  }

  async createTemporaryReservation(
    queryRunner: QueryRunner,
    campRegistration: CampRegistration,
    campVariants: CampVariant[],
    campVariantVacancies: Map<number, number>,
    userId: string,
    paymentMethod: PaymentMethod,
  ) {
    /// create payment
    const totalAmount = this.calculateCampVariantRegistrationPrice(
      campVariants,
      campVariantVacancies,
    );

    const payment = await queryRunner.manager.save(RegistrationPayment, {
      campRegistrationId: campRegistration.id,
      amount: totalAmount,
      paymentMethod,
      userId,
    });

    const reservations: CreateRegistrationReserveInput[] = [];
    campVariantVacancies.forEach((value, key) => {
      reservations.push({
        campRegistrationId: campRegistration.id,
        campVariantId: key,
        count: value,
        paymentId: payment.id,
        userId,
      });
    });

    const reserve = await queryRunner.manager.insert(
      RegistrationReserve,
      reservations,
    );

    if (reserve.raw.affectedRows !== reservations.length)
      throw Error('Failed to reserve registrations');

    // deduct vacancies
    // for (const [key, value] of campVariantVacancies) {
    //   const update = await queryRunner.manager.update(
    //     CampVariant,
    //     { id: key },
    //     { remainingCapacity: () => `remainingCapacity - ${value}` },
    //   );

    //   if (update.affected !== 1) {
    //     const campVariant = campVariants.find((e) => e.id == key);
    //     throw Error(
    //       `Failed to deduct capacity from ${campVariant.name} (${campRegistration.id})`,
    //     );
    //   }
    // }

    await queryRunner.commitTransaction();
    return {
      success: true,
      payment: payment,
    };
  }

  remove(id: number) {
    return `This action removes a #${id} campRegistration`;
  }

  setPaymentTimoout(paymentId: number) {
    const timeout = 11 * 60 * 1000; // 11 minutes
    setTimeout(async () => {
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        const payment = await queryRunner.manager.findOne(RegistrationPayment, {
          where: { id: paymentId },
        });

        if (!payment) {
          throw new Error('Payment not found');
        }

        if (payment.status !== PaymentStatus.pending) {
          throw new Error('Payment already processed');
        }

        await queryRunner.manager.update(
          RegistrationPayment,
          { id: paymentId },
          {
            status: PaymentStatus.expired,
          },
        );

        const reserves = await queryRunner.manager.find(RegistrationReserve, {
          where: { paymentId },
        });

        if (reserves.length) {
          const campVariantIds = reserves.map(
            (reserve) => reserve.campVariantId,
          );

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
            paymentId,
          });
        }

        await queryRunner.commitTransaction();
        console.log('Payment expired and reserves released');
      } catch (e) {
        await queryRunner.rollbackTransaction();
        console.log(e);
      } finally {
        queryRunner.release();
      }
    }, timeout);
  }
}
