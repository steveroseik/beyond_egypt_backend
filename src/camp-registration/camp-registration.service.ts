import { Injectable } from '@nestjs/common';
import { CreateCampRegistrationInput } from './dto/create-camp-registration.input';
import { CompleteCampRegistrationInput } from './dto/complete-camp-registration.input';
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
import { generateMerchantRefNumber } from 'support/random-uuid.generator';
import { Discount } from 'src/discount/entities/discount.entity';
import { max, min } from 'lodash';
import { Camp } from 'src/camp/entities/camp.entity';
import { MailService } from 'src/mail/mail.service';
import { generateCampRegistrationEmail } from 'src/mail/templates/camp-registration-confirmation';
import { UpdateCampRegistrationInput } from './dto/update-camp-registration.input';
import { UpdateCampVariantRegistrationInput } from 'src/camp-variant-registration/dto/update-camp-variant-registration.input';
import { ConfirmCampRegistrationInput } from './dto/confirm-camp-registration.input';
dotenv.config();

@Injectable()
export class CampRegistrationService {
  constructor(
    @InjectRepository(CampRegistration)
    private repo: Repository<CampRegistration>,
    private dataSource: DataSource,
    private awsService: AwsBucketService,
    private mailService: MailService,
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
        input.discountId = undefined;
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
    if (!input.campVariantRegistrations?.length) {
      throw new Error('Registration must have at least one week');
    }

    if (input.oneDayPrice) {
      if (input.campVariantRegistrations?.length != 1) {
        throw new Error('One day registration must have only one week');
      }

      if (input.discountId) {
        throw new Error('Discounts are not allowed for one day registrations');
      }
    }

    let discount: Discount;

    if (input.discountId) {
      discount = await this.findDiscount(input.discountId, queryRunner);
    }

    const camp = await queryRunner.manager.findOne(Camp, {
      where: { id: input.campId },
    });

    if (!camp) {
      throw new Error('Camp not found');
    }

    /// TODO: remove when getting meal price from variants
    const campRegistration = await queryRunner.manager.save(CampRegistration, {
      ...input,
    });

    if (!campRegistration) {
      throw new Error('Failed to create camp registration');
    }

    /// assign camp to registration
    campRegistration.camp = camp;

    let totalVariantsAmount = await this.handleCampVariantRegistrations({
      campVariantRegistrations: input.campVariantRegistrations,
      campRegistration,
      queryRunner,
      oneDayPrice: input.oneDayPrice,
      discount,
    });

    let discountAmount: Decimal = undefined;

    if (discount?.amount) {
      discountAmount = min([totalVariantsAmount, discount.amount]);
    }

    const updatePrice = await queryRunner.manager.update(
      CampRegistration,
      { id: campRegistration.id },
      {
        oneDayPrice: input.oneDayPrice,
        amount: totalVariantsAmount?.toFixed(moneyFixation),
        discountAmount: discountAmount?.toFixed(moneyFixation),
        paidAmount: '0',
        discountId: discount?.id,
      },
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
        totalAmount: totalVariantsAmount,
      },
    };
  }

  async handleCampVariantRegistrations({
    campVariantRegistrations,
    campRegistration,
    queryRunner,
    oneDayPrice,
    existingRegistrations,
    discount,
  }: {
    campVariantRegistrations?: CreateCampVariantRegistrationInput[];
    campRegistration: CampRegistration;
    queryRunner: QueryRunner;
    oneDayPrice?: Decimal;
    existingRegistrations?: CampVariantRegistration[];
    discount?: Discount;
  }): Promise<Decimal | null> {
    if (!campVariantRegistrations?.length && !existingRegistrations?.length) {
      console.log('Failed to find data to calculate within');
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

    const inserts: CampVariantRegistration[] = !campVariantRegistrations?.length
      ? []
      : await queryRunner.manager.save(
          CampVariantRegistration,
          campVariantRegistrations.map((e) => {
            let basePrice =
              oneDayPrice ??
              campVariants.find((cv) => cv.id === e.campVariantId).price;
            let priceDiscount: Decimal = undefined;

            /// TODO: fetch meal price from camp variant not camp
            let baseMealPrice = e.withMeal
              ? campRegistration.camp.mealPrice
              : undefined;
            let mealDiscount: Decimal = undefined;

            /// calculate price if not one day price
            if (!oneDayPrice && discount?.percentage) {
              priceDiscount = min([
                discount.percentage.multipliedBy(basePrice),
                discount.maximumDiscount,
              ]);

              mealDiscount = min([
                discount.percentage.multipliedBy(baseMealPrice),
                discount.maximumDiscount,
              ]);
            }

            return {
              ...e,
              campRegistrationId: campRegistration.id,
              discountId: discount?.id ?? null,
              mealPrice: baseMealPrice?.toFixed(moneyFixation),
              price: basePrice.toFixed(moneyFixation),
              variantDiscount: priceDiscount?.toFixed(moneyFixation),
              mealDiscount: mealDiscount?.toFixed(moneyFixation),
            };
          }),
        );

    if (inserts.length !== (campVariantRegistrations?.length ?? 0)) {
      throw new Error('Failed to insert camp variant registrations');
    }

    if (existingRegistrations?.length) {
      // update existing registration discounts
      if (discount) {
        for (const registration of existingRegistrations) {
          // only if discount is different change the discount
          if (registration.discountId !== discount.id) {
            const basePrice = registration.price;
            const mealPrice = registration.mealPrice;
            let priceDiscount: Decimal = null;
            let mealDiscount: Decimal = null;

            if (discount.percentage) {
              priceDiscount = min([
                discount.percentage.multipliedBy(basePrice),
                discount.maximumDiscount,
              ]);

              mealDiscount = mealPrice
                ? min([
                    discount.percentage.multipliedBy(mealPrice),
                    discount.maximumDiscount,
                  ])
                : null;
            }

            registration.discountId = discount.id ?? null;
            registration.variantDiscount = priceDiscount;
            registration.mealDiscount = mealDiscount;

            const saved = await queryRunner.manager.save(
              CampVariantRegistration,
              registration,
            );

            if (!saved) {
              throw new Error(
                'Failed to update existing registration discount',
              );
            }
          }
        }
      }

      const existingPrice = this.calculateCampVariantRegistrationPrice(
        campVariants,
        existingRegistrations,
      );

      const newPrice = this.calculateCampVariantRegistrationPrice(
        campVariants,
        inserts,
      );

      return existingPrice.plus(newPrice);
    }

    return oneDayPrice
      ? oneDayPrice
      : this.calculateCampVariantRegistrationPrice(campVariants, inserts);
  }

  calculateCampVariantRegistrationPrice(
    campVariants: CampVariant[],
    campVariantRegistrations: CampVariantRegistration[],
  ): Decimal {
    let totalPrice = new Decimal('0');

    for (const registration of campVariantRegistrations as CampVariantRegistration[]) {
      const cvr = campVariants.find((e) => e.id === registration.campVariantId);
      totalPrice = totalPrice.plus(cvr.price.plus(registration.mealPrice ?? 0));
    }
    return totalPrice;
  }

  findOne(id: number) {
    return this.repo.findOne({
      where: { id },
    });
  }

  async completeCampRegistration(
    input: CompleteCampRegistrationInput,
    userId: string,
    type: UserType,
  ) {
    if (type !== UserType.parent) {
      return {
        success: false,
        message: 'Unauthorized, only parents can complete registrations',
      };
    }

    input.parentId = userId;

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
      return await this.handleParentCampCompletion(
        input,
        campRegistration,
        queryRunner,
        userId,
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

  async handleParentCampCompletion(
    input: CompleteCampRegistrationInput,
    campRegistration: CampRegistration,
    queryRunner: QueryRunner,
    userId: string,
  ) {
    if (!input.campVariantRegistrations?.length)
      throw new Error('Set at least one week for registration');

    const deleteOldVariants = await queryRunner.manager.delete(
      CampVariantRegistration,
      {
        campRegistrationId: campRegistration.id,
      },
    );

    if (
      deleteOldVariants.affected !==
      campRegistration.campVariantRegistrations?.length
    ) {
      throw Error('Failed to remove old weeks from registration');
    }

    let discount: Discount = undefined;

    if (input.discountId) {
      discount = await this.findDiscount(input.discountId, queryRunner);
    }

    const amount = await this.handleCampVariantRegistrations({
      campVariantRegistrations: input.campVariantRegistrations,
      campRegistration,
      queryRunner,
      discount,
    });

    let discountAmount: Decimal = undefined;
    if (discount?.amount) {
      discountAmount = min([amount, discount.amount]);
    }

    await queryRunner.manager.update(
      CampRegistration,
      { id: input.id, parentId: userId },
      {
        amount: amount?.toFixed(moneyFixation),
        discountAmount: discountAmount?.toFixed(moneyFixation) ?? null,
        oneDayPrice: null,
        discountId: discount?.id,
        paidAmount: '0',
        refundPolicyConsent: input.refundPolicyConsent,
        behaviorConsent: input.behaviorConsent,
      },
    );

    await queryRunner.commitTransaction();

    return {
      success: true,
      message: 'Camp registration completed successfully',
      data: {
        totalAmount: amount,
      },
    };
  }

  async handleIdleCampUpdate(
    input: UpdateCampRegistrationInput,
    campRegistration: CampRegistration,
    queryRunner: QueryRunner,
  ) {
    // admin only
    if (input.oneDayPrice) {
      if (input.discountId) {
        throw new Error('Discounts are not allowed for one day registrations');
      }

      if (
        input.campVariantRegistrations?.length != 1 &&
        campRegistration.campVariantRegistrations?.length != 1
      ) {
        throw new Error('One day registration must have only one week');
      }

      if (campRegistration.campVariantRegistrations?.length > 1) {
        const deleteOldVariants = await queryRunner.manager.delete(
          CampVariantRegistration,
          {
            campRegistrationId: campRegistration.id,
          },
        );

        if (deleteOldVariants.affected !== 1) {
          throw Error('Failed to remove old weeks from registration');
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
          amount: total.toFixed(moneyFixation),
          paidAmount: '0',
          discountId: null,
          discountAmount: null,
        },
      );

      if (updated.affected !== 1) {
        throw new Error('Failed to update camp registration');
      }

      // reset all payments
      await this.resetCampPaymentMethod(campRegistration, queryRunner);

      await queryRunner.commitTransaction();

      return {
        success: true,
        message: 'One Day Camp registration updated successfully',
        data: {
          totalAmount: input.oneDayPrice,
        },
      };

      /// if one day price is null
    } else {
      if (!input.campVariantRegistrations?.length)
        throw new Error('Set at least one week for registration');

      let discount: Discount = null;
      if (input.discountId) {
        discount = await this.findDiscount(input.discountId, queryRunner);
      }

      const deleted = await queryRunner.manager.delete(
        CampVariantRegistration,
        {
          campRegistrationId: campRegistration.id,
        },
      );

      if (
        deleted.affected !== campRegistration.campVariantRegistrations?.length
      ) {
        throw new Error('Failed to remove old one day registration');
      }

      const price = await this.handleCampVariantRegistrations({
        campVariantRegistrations: input.campVariantRegistrations,
        campRegistration,
        queryRunner,
        discount,
      });

      let amountDiscounted: Decimal = null;
      if (discount?.amount) {
        amountDiscounted = min([price, discount.amount]);
      }

      const updated = await queryRunner.manager.update(
        CampRegistration,
        { id: input.id },
        {
          paidAmount: '0',
          paymentMethod: input.paymentMethod,
          oneDayPrice: null,
          amount: price.toFixed(moneyFixation),
          discountId: discount?.id ?? null,
          discountAmount: amountDiscounted?.toFixed(moneyFixation) ?? null,
        },
      );

      if (updated.affected !== 1) {
        throw new Error('Failed to update camp registration');
      }

      // reset all payments
      await this.resetCampPaymentMethod(campRegistration, queryRunner);

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

  async resetCampPaymentMethod(
    campRegistration: CampRegistration,
    queryRunner: QueryRunner,
  ) {
    const expirePayments = await queryRunner.manager.update(
      RegistrationPayment,
      { campRegistrationId: campRegistration.id },
      { status: PaymentStatus.expired },
    );

    return expirePayments;
  }

  async findDiscount(id: number, queryRunner: QueryRunner): Promise<Discount> {
    const discount = await queryRunner.manager.findOne(Discount, {
      where: { id },
    });

    if (!discount) {
      throw new Error('Discount not found');
    }

    const discountEnded =
      moment().tz('Africa/Cairo').diff(discount.endDate) < 0;
    const discountStarted =
      moment().tz('Africa/Cairo').diff(discount.startDate) > 0;

    if (discountEnded || !discountStarted) {
      throw new Error('Discount is not valid');
    }
    return discount;
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

      if (
        campRegistration.refundPolicyConsent === false &&
        input.refundPolicyConsent === false
      ) {
        throw new Error('Refund policy consent is required');
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
    input: ProcessCampRegistrationInput,
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
          input,
        );
      case PaymentMethod.fawry:
        return await this.handleFawryPayment(
          campRegistration,
          campVariants,
          campVariantVacancies,
          queryRunner,
          userId,
          input,
        );
    }
  }

  async handleFawryPayment(
    campRegistration: CampRegistration,
    campVariants: CampVariant[],
    campVariantVacancies: Map<number, number>,
    queryRunner: QueryRunner,
    userId: string,
    input: ProcessCampRegistrationInput,
  ) {
    //const find parent
    const parent = await queryRunner.manager.findOne(User, {
      where: { id: campRegistration.parentId },
    });

    if (!parent) {
      throw Error('Failed to find parent');
    }

    if (
      campRegistration.behaviorConsent !== input.behaviorConsent ||
      campRegistration.refundPolicyConsent !== input.refundPolicyConsent
    ) {
      await queryRunner.manager.update(
        CampRegistration,
        { id: campRegistration.id },
        {
          refundPolicyConsent: input.refundPolicyConsent,
          behaviorConsent: input.behaviorConsent,
        },
      );
    }

    /// create payment
    const totalAmount = this.calculateCampVariantRegistrationPrice(
      campVariants,
      campRegistration.campVariantRegistrations,
    );

    const payment = await queryRunner.manager.save(RegistrationPayment, {
      campRegistrationId: campRegistration.id,
      amount: totalAmount?.toFixed(moneyFixation),
      paymentMethod: PaymentMethod.fawry,
      userId,
    });

    if (!payment) {
      throw Error('Failed to create payment record');
    }

    const tenMinutesFromNow = moment.tz('Africa/Cairo').add(10, 'minute');
    // const tenMinutesFromNow = Date.now() + 10 * 60 * 1000;

    const merchantRef = generateMerchantRefNumber(payment.id);

    const payloadData: PaymentPayload = {
      merchantRefNum: merchantRef.toString(),
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
          /// TODO: fix, old implementation
          price: totalAmount.toFixed(moneyFixation),
          quantity: 1,
        },
      ],
      returnUrl: `${process.env.BASE_URL}/fawry/return`,
    };

    console.log(payloadData);

    const paymentUrl = await generateFawryPaymentUrl(payloadData);

    if (!paymentUrl) throw Error('Payment url received empty');

    payment.url = paymentUrl;
    const updatePayment = await queryRunner.manager.update(
      RegistrationPayment,
      { id: payment.id },
      {
        url: paymentUrl,
        expirationDate: tenMinutesFromNow.toDate(),
        referenceNumber: merchantRef,
      },
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
    input: ProcessCampRegistrationInput,
  ) {
    if (
      paymentMethod === PaymentMethod.instapay &&
      (!input.receipt || !input.referenceNumber)
    ) {
      throw Error('Receipt is required for Instapay payment');
    }

    /// create payment
    const totalAmount = this.calculateCampVariantRegistrationPrice(
      campVariants,
      campRegistration.campVariantRegistrations,
    );

    let key: string = undefined;
    if (input.receipt) {
      const response = await this.awsService.uploadSingleFileFromBase64({
        base64File: input.receipt.base64,
        fileName: input.receipt.name,
        isPublic: true,
      });

      if (!response.success || !response.key) {
        throw Error('Failed to upload receipt');
      }

      key = response.key;
    }

    const payment = await queryRunner.manager.save(RegistrationPayment, {
      campRegistrationId: campRegistration.id,
      amount: totalAmount?.toFixed(moneyFixation),
      paymentMethod,
      userId,
      receipt: key,
      referenceNumber: input.referenceNumber,
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

  async update(input: UpdateCampRegistrationInput) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      /// get old registration
      const campRegistration = await queryRunner.manager.findOne(
        CampRegistration,
        {
          where: { id: input.id },
          relations: [
            'camp',
            'campVariantRegistrations',
            'campVariantRegistrations',
          ],
        },
      );

      if (!campRegistration) {
        throw new Error('Camp registration not found');
      }
      if (
        campRegistration.status === CampRegistrationStatus.idle ||
        (campRegistration.status === CampRegistrationStatus.pending &&
          campRegistration.paymentMethod === PaymentMethod.cash)
      ) {
        return await this.handleIdleCampUpdate(
          input,
          campRegistration,
          queryRunner,
        );
      }

      return await this.handlePaidCampUpdate(
        input,
        campRegistration,
        queryRunner,
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

  async handlePaidCampUpdate(
    input: UpdateCampRegistrationInput,
    campRegistration: CampRegistration,
    queryRunner: QueryRunner,
  ) {
    let existingVariants = campRegistration.campVariantRegistrations;
    let variantsToUpdate: UpdateCampVariantRegistrationInput[] = [];
    let variantsToInsert: CreateCampVariantRegistrationInput[] = [];
    let variantsToDelete: number[] = [];
    let campVariantIds: number[] = [];

    if (input.campVariantRegistrations?.length) {
      for (const variant of input.campVariantRegistrations) {
        const existing = existingVariants.find(
          (e) =>
            e.childId == variant.childId &&
            e.campVariantId == variant.campVariantId,
        );
        if (existing) {
          if (
            (variant.withMeal && !existing.mealPrice) ||
            (!variant.withMeal && existing.mealPrice)
          ) {
            variantsToUpdate.push({
              id: existing.id,
              ...variant,
            });
          }
        } else {
          variantsToInsert.push(variant);
        }
      }
    }

    variantsToDelete = existingVariants
      .filter((e) => {
        return !input.campVariantRegistrations?.find(
          (i) => i.childId == e.childId && i.campVariantId == e.campVariantId,
        );
      })
      .map((e) => e.id);

    existingVariants = existingVariants.filter((e) => {
      return (
        !variantsToUpdate.find((v) => v.id == e.id) &&
        !variantsToDelete.find((v) => v == e.id) &&
        !variantsToInsert.find(
          (v) => v.childId == e.childId && v.campVariantId == e.campVariantId,
        )
      );
    });

    let oldDiscount: Discount = undefined;
    let newDiscount: Discount = null;

    newDiscount =
      input.discountId &&
      (await this.findDiscount(input.discountId, queryRunner));

    oldDiscount =
      campRegistration.discountId &&
      (await this.findDiscount(campRegistration.discountId, queryRunner));

    campVariantIds = [
      ...variantsToUpdate.map((e) => e.campVariantId),
      ...variantsToInsert.map((e) => e.campVariantId),
      ...existingVariants.map((e) => e.campVariantId),
    ];

    const campVariants = await queryRunner.manager.find(CampVariant, {
      where: { id: In(campVariantIds) },
      lock: { mode: 'pessimistic_write' },
    });
    if (campVariants.length !== campVariantIds.length) {
      throw new Error('Invalid camp week reference');
    }

    if (!oldDiscount && !newDiscount) {
      // first flow
    }

    if (oldDiscount && !newDiscount) {
      // second flow
      await this.validateVacancies(variantsToInsert, queryRunner);
    }

    if (!oldDiscount && newDiscount) {
      // third flow
    }

    // fourth flow

    if (oldDiscount?.isValid && newDiscount) {
      throw Error('Cannot add new discount, old discount is still valid');
    }

    throw new Error('Not implemented');
  }

  /// validate if there are enough vacancies
  async getMoneyDifference(
    input: UpdateCampRegistrationInput,
    campRegistration: CampRegistration,
    campVariants: CampVariant[],
    queryRunner: QueryRunner,
  ) {
    /// get total of paid amount
    const response = await queryRunner.manager
      .createQueryBuilder(RegistrationPayment, 'registrationPayment')
      .select('SUM(amount) as paidAmount')
      .where({ status: PaymentStatus.paid, campRegistrationId: input.id })
      .getRawOne();

    const paidAmount = new Decimal(`${response.paidAmount ?? 0}`);
  }

  async validateVacancies(
    campVariantRegistrations: CreateCampVariantRegistrationInput[],
    queryRunner: QueryRunner,
  ) {
    const campVariantVacancies = new Map<number, number>();

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
    const campVariants = await queryRunner.manager.find(CampVariant, {
      where: { id: In(campVariantIds) },
      lock: { mode: 'pessimistic_write' },
    });

    if (campVariants.length !== campVariantIds.length) {
      throw new Error('Invalid camp week reference');
    }

    for (const cv of campVariants) {
      if (campVariantVacancies.get(cv.id) > cv.remainingCapacity) {
        throw new Error(`Not enough vacancies for ${cv.name} (${cv.campId})`);
      }
    }

    return campVariantVacancies;
  }

  async confirmCampRegistration(
    input: ConfirmCampRegistrationInput,
    userId: string,
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const campRegistration = await this.repo.findOne({
        where: { id: input.id },
        relations: ['campVariantRegistrations', 'camp'],
      });

      if (!campRegistration) {
        throw new Error('Camp registration not found or incomplete');
      }

      if (campRegistration.status !== CampRegistrationStatus.pending) {
        throw new Error('Camp registration already processed');
      }

      if (campRegistration.refundPolicyConsent === false) {
        throw new Error('Refund policy consent is required');
      }

      if (campRegistration.paymentMethod === PaymentMethod.fawry) {
        throw new Error('Fawry payment is not supported');
      }

      const campVariantIds = Array.from(
        new Set(
          campRegistration.campVariantRegistrations.map((e) => e.campVariantId),
        ),
      );

      // Lock the CampVariant records
      const campVariants = await queryRunner.manager.find(CampVariant, {
        where: { id: In(campVariantIds) },
        lock: { mode: 'pessimistic_write' },
      });

      // Validate if there are enough vacancies
      const vacancies = new Map<number, number>();
      for (const cv of campVariants) {
        const count = campRegistration.campVariantRegistrations.filter(
          (e) => e.campVariantId === cv.id,
        ).length;
        if (cv.remainingCapacity < count) {
          throw new Error(`Not enough vacancies for ${cv.name}`);
        }
        vacancies.set(cv.id, count);

        throw new Error('Not implemented');
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

  async test() {
    const campRegistration = await this.repo.findOne({
      where: { id: 4 },
      relations: [
        'campVariantRegistrations',
        'parent',
        'campVariantRegistrations.child',
        'campVariantRegistrations.campVariant',
      ],
    });

    if (!campRegistration) {
      throw new Error('Camp registration not found');
    }

    const htmlContent = generateCampRegistrationEmail({
      registration: campRegistration,
      qrCodeUrl:
        'https://beyond-egypt.s3.amazonaws.com/91895637-f3ee-4cb5-8a28-f6d78c362219.png',
    });
    const response = await this.mailService.sendMail({
      to: 'steveroseik@gmail.com',
      subject: 'New Camp Registration',
      text: 'Helloo',
      html: htmlContent,
    });

    return response;
  }
}
