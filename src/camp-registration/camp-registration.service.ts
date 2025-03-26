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
import { ProcessCampRegistrationInput } from './dto/process-camp-registration.input';
import { PaymentPayload } from 'src/fawry/models/payment.payload';
import { RegistrationPayment } from 'src/registration-payment/entities/registration-payment.entity';
import * as moment from 'moment-timezone';
import { generateFawryPaymentUrl } from 'src/fawry/generate/payment.generate';
import { RegistrationReserve } from 'src/registration-reserve/entities/registration-reserve.entity';
import { CreateRegistrationReserveInput } from 'src/registration-reserve/dto/create-registration-reserve.input';

import * as dotenv from 'dotenv';
import { Decimal } from 'support/scalars';
import { moneyFixation } from 'support/constants';
import { Base64Image } from 'support/shared/base64Image.object';
import { AwsBucketService } from 'src/aws-bucket/aws-bucket.service';
dotenv.config();

@Injectable()
export class CampRegistrationService {
  constructor(
    @InjectRepository(CampRegistration)
    private repo: Repository<CampRegistration>,
    private dataSource: DataSource,
    private awsService: AwsBucketService,
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

    const campRegistration = await queryRunner.manager.save(CampRegistration, {
      ...input,
      oneDayPrice: input.oneDayPrice?.toFixed(moneyFixation),
      totalPrice: input.totalPrice?.toFixed(moneyFixation),
    });

    if (!campRegistration) {
      throw new Error('Failed to create camp registration');
    }

    const total = await this.handleCampVariantRegistrations({
      campVariantRegistrations: input.campVariantRegistrations,
      campRegistration,
      queryRunner,
      oneDayPrice: input.oneDayPrice,
    });

    const updatePrice = await queryRunner.manager.update(
      CampRegistration,
      { id: campRegistration.id },
      { totalPrice: total },
    );

    if (updatePrice.affected !== 1) {
      throw new Error('Failed to update camp registration price');
    }

    await queryRunner.commitTransaction();

    return {
      success: true,
      message: 'Camp registration created successfully',
      data: {
        campRegistrationId: campRegistration.id,
        totalAmount: total,
      },
    };
  }

  async handleCampVariantRegistrations({
    campVariantRegistrations,
    campRegistration,
    queryRunner,
    oneDayPrice,
    existingVariants: existingRegistrations,
  }: {
    campVariantRegistrations: CreateCampVariantRegistrationInput[];
    campRegistration: CampRegistration;
    queryRunner: QueryRunner;
    oneDayPrice?: Decimal;
    existingVariants?: CampVariantRegistration[];
  }): Promise<string | null> {
    if (!campVariantRegistrations?.length) {
      return null;
    }

    // store camp variant vacancies needed to be reserved
    let campVariantVacancies = new Map<number, number>();

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
      if (!campVariantVacancies.has(cvr.campVariantId)) {
        campVariantVacancies.set(cvr.campVariantId, 1);
      } else {
        campVariantVacancies.set(
          cvr.campVariantId,
          campVariantVacancies.get(cvr.campVariantId) + 1,
        );
      }
    }

    const campVariantIds = Array.from(campVariantVacancies.keys());

    // validate if there are enough vacancies
    const campVariants = await queryRunner.manager.find(CampVariant, {
      where: { id: In(campVariantIds) },
      lock: { mode: 'pessimistic_write' },
    });

    if (!oneDayPrice) {
      if (campVariants.length !== campVariantIds.length) {
        throw new Error('Invalid camp variant reference');
      }

      for (const cv of campVariants) {
        if (cv.remainingCapacity < campVariantVacancies.get(cv.id)) {
          throw new Error(`Not enough vacancies for ${cv.name}`);
        }
      }
    }

    const inserts = await queryRunner.manager.insert(
      CampVariantRegistration,
      campVariantRegistrations.map((e) => ({
        ...e,
        campRegistrationId: campRegistration.id,
        mealPrice: e.withMeal
          ? campRegistration.camp.mealPrice.toFixed(moneyFixation)
          : undefined,
        price:
          oneDayPrice?.toFixed(moneyFixation) ??
          campVariants
            .find((cv) => cv.id === e.campVariantId)
            .price?.toFixed(moneyFixation),
      })),
    );

    if (inserts.raw.affectedRows !== campVariantRegistrations.length) {
      throw new Error('Failed to insert camp variant registrations');
    }

    if (existingRegistrations?.length) {
      const existingPrice = this.calculateCampVariantRegistrationPrice(
        campVariants,
        existingRegistrations,
        campRegistration.camp.mealPrice,
      );

      const newPrice = this.calculateCampVariantRegistrationPrice(
        campVariants,
        campVariantRegistrations,
        campRegistration.camp.mealPrice,
      );

      return new Decimal(existingPrice).plus(newPrice).toFixed(moneyFixation);
    }

    return oneDayPrice
      ? oneDayPrice.toFixed(moneyFixation)
      : this.calculateCampVariantRegistrationPrice(
          campVariants,
          campVariantRegistrations,
          campRegistration.camp.mealPrice,
        );
  }

  calculateCampVariantRegistrationPrice(
    campVariants: CampVariant[],
    campVariantRegistrations:
      | CreateCampVariantRegistrationInput[]
      | CampVariantRegistration[],
    mealPrice?: Decimal,
  ): string {
    let totalPrice = new Decimal('0');

    if (campVariantRegistrations.some((item) => 'withMeal' in item)) {
      for (const registration of campVariantRegistrations as CreateCampVariantRegistrationInput[]) {
        const cvr = campVariants.find(
          (e) => e.id === registration.campVariantId,
        );

        totalPrice = totalPrice.plus(
          cvr.price.plus(registration.withMeal ? mealPrice : 0),
        );
      }
    } else {
      for (const registration of campVariantRegistrations as CampVariantRegistration[]) {
        const cvr = campVariants.find(
          (e) => e.id === registration.campVariantId,
        );
        totalPrice = totalPrice.plus(
          cvr.price.plus(registration.mealPrice ?? 0),
        );
      }
    }

    return totalPrice.toFixed(2);
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
      relations: ['campVariantRegistrations', 'camp'],
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
          campRegistration,
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
    campRegistration: CampRegistration,
    queryRunner: QueryRunner,
    userId: string,
  ) {
    if (!input.campVariantRegistrations?.length)
      throw new Error('Set at least one week for registration');

    const price = await this.handleCampVariantRegistrations({
      campVariantRegistrations: input.campVariantRegistrations,
      campRegistration,
      queryRunner,
    });

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
      /// the variants to register length is one
      if (input.campVariantRegistrations?.length == 1) {
        // delete old camp variants if existing
        if (campRegistration.campVariantRegistrations?.length) {
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
        /// if variants to register are more than one OR null
      } else {
        if (input.campVariantRegistrations?.length) {
          throw new Error('One day registration must have only one week');
        }

        /// if input.campVariantRegistrations is null
        // must delete variants - 1
        if (!input.campVariantRegistrations?.length) {
          if (
            (input.variantsToDelete?.length ?? 0) -
              (campRegistration?.campVariantRegistrations?.length ?? 0) !=
            1
          ) {
            throw new Error('One day registration must have only one week');
          }
        }

        if (input.variantsToDelete?.length) {
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
      }

      // create new camp variant
      const total = await this.handleCampVariantRegistrations({
        campVariantRegistrations: input.campVariantRegistrations,
        campRegistration,
        queryRunner,
        oneDayPrice: input.oneDayPrice,
      });

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
        data: {
          totalAmount: input.oneDayPrice,
        },
      };

      /// if one day price is null
    } else {
      let existingVariants: CampVariantRegistration[] = [];
      if (
        campRegistration.oneDayPrice &&
        campRegistration.campVariantRegistrations?.length === 1
      ) {
        const deleteOldOneDayPass = await queryRunner.manager.delete(
          CampVariantRegistration,
          {
            id: campRegistration.campVariantRegistrations[0].id,
          },
        );

        if (deleteOldOneDayPass.affected !== 1) {
          throw new Error('Failed to remove old one day registration');
        }
      } else {
        if (input.variantsToDelete?.length) {
          const deleteOldVariants = await queryRunner.manager.delete(
            CampVariantRegistration,
            {
              id: In(input.variantsToDelete),
            },
          );

          if (deleteOldVariants.affected !== input.variantsToDelete.length) {
            throw Error('Failed to remove old weeks from registration');
          }

          existingVariants = campRegistration.campVariantRegistrations.filter(
            (e) => !input.variantsToDelete.includes(e.id),
          );
        }
      }

      if (input.campVariantRegistrations?.length) {
        const price = await this.handleCampVariantRegistrations({
          campVariantRegistrations: input.campVariantRegistrations,
          campRegistration,
          queryRunner,
          existingVariants,
        });

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
          data: {
            totalAmount: price,
          },
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

    if (input.statuses) {
      queryBuilder.andWhere('campRegistration.status IN (:...statuses)', {
        statuses: input.statuses,
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
    input: ProcessCampRegistrationInput,
    userId: string,
    userType: UserType,
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const campRegistration = await this.repo.findOne({
        where: { id: input.campRegistrationId },
        relations: ['campVariantRegistrations', 'payments', 'camp'],
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
        input,
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
    input?: ProcessCampRegistrationInput,
  ) {
    const paymentMethod = input.paymentMethod ?? campRegistration.paymentMethod;

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
          input.receipt,
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
      campRegistration.campVariantRegistrations,
      campRegistration.camp.mealPrice,
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
      returnUrl: `${process.env.BASE_URL}/fawry/return`,
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
    receipt?: Base64Image,
  ) {
    if (paymentMethod === PaymentMethod.instapay && !receipt) {
      throw Error('Receipt is required for Instapay payment');
    }

    /// create payment
    const totalAmount = this.calculateCampVariantRegistrationPrice(
      campVariants,
      campRegistration.campVariantRegistrations,
      campRegistration.camp.mealPrice,
    );

    let key: string = undefined;
    if (receipt) {
      const response = await this.awsService.uploadSingleFileFromBase64({
        base64File: receipt.base64,
        fileName: receipt.name,
        isPublic: true,
      });

      if (!response.success || !response.key) {
        throw Error('Failed to upload receipt');
      }

      key = response.key;
    }

    const payment = await queryRunner.manager.save(RegistrationPayment, {
      campRegistrationId: campRegistration.id,
      amount: totalAmount,
      paymentMethod,
      userId,
      receipt: key,
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

    const updateCampRegistration = await queryRunner.manager.update(
      CampRegistration,
      {
        id: campRegistration.id,
      },
      {
        status: CampRegistrationStatus.pending,
      },
    );

    if (updateCampRegistration.affected !== 1) {
      throw Error('Failed to update camp registration status');
    }

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
          lock: { mode: 'pessimistic_write' },
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
          lock: { mode: 'pessimistic_write' },
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
