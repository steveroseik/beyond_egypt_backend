import { Injectable } from '@nestjs/common';
import { CreateCampRegistrationInput } from './dto/create-camp-registration.input';
import { CompleteCampRegistrationInput } from './dto/complete-camp-registration.input';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  In,
  IsNull,
  MoreThan,
  Not,
  QueryRunner,
  Repository,
} from 'typeorm';
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
import {
  cancelPayment,
  generateFawryPaymentUrl,
  requestRefund,
} from 'src/fawry/generate/payment.generate';
import { RegistrationReserve } from 'src/registration-reserve/entities/registration-reserve.entity';
import { CreateRegistrationReserveInput } from 'src/registration-reserve/dto/create-registration-reserve.input';

import * as dotenv from 'dotenv';
import { Decimal } from 'support/scalars';
import { moneyFixation, onlineTTL } from 'support/constants';
import { Base64Image } from 'support/shared/base64Image.object';
import { AwsBucketService } from 'src/aws-bucket/aws-bucket.service';
import { generateMerchantRefNumber } from 'support/random-uuid.generator';
import { Discount } from 'src/discount/entities/discount.entity';
import { difference, max, min } from 'lodash';
import { Camp } from 'src/camp/entities/camp.entity';
import { MailService } from 'src/mail/mail.service';
import { generateCampRegistrationEmail } from 'src/mail/templates/camp-registration-confirmation';
import { UpdateCampRegistrationInput } from './dto/update-camp-registration.input';
import { UpdateCampVariantRegistrationInput } from 'src/camp-variant-registration/dto/update-camp-variant-registration.input';
import { ConfirmCampRegistrationInput } from './dto/confirm-camp-registration.input';
import { CampRegistrationRefundOptionsInput } from './dto/camp-registration-refund-options.input';
import { EncryptionService } from 'src/encryption/encryption.service';
import { v4 as uuid } from 'uuid';
import { ProcessCampRegistrationRefundInput } from './dto/process-camp-registration-refund.input';
import {
  parseRefundPayload,
  RefundOption,
  RefundPayload,
} from 'src/encryption/paylaods/refund.payload';
import { getSumOfPaidAmounts } from 'support/helpers/calculate-sum-of-paid';
import { CompleteRegistrationRefundInput } from './dto/complete-registration-refund.input';
import { RegistrationAttendance } from 'src/registration-attendance/entities/registration-attendance.entity';
import { getDateDifferenceInDays } from 'support/helpers/days-diferrence.calculator';
import { Child } from 'src/child/entities/child.entity';
import { chdir } from 'process';
import { parseCampRegCode } from 'support/helpers/camp-reg-code.mini';
import {
  createPaymobIntention,
  generatePaymobCheckoutUrl,
  requestPaymobRefund,
} from 'src/paymob/generate/payment.generate';

dotenv.config();

@Injectable()
export class CampRegistrationService {
  constructor(
    @InjectRepository(CampRegistration)
    private repo: Repository<CampRegistration>,
    private dataSource: DataSource,
    private awsService: AwsBucketService,
    private mailService: MailService,
    private encryptionService: EncryptionService,
  ) {}

  findAllByKeys(keys: readonly number[]) {
    return this.repo.find({
      where: { id: In(keys) },
    });
  }

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
      relations: ['ageRanges'],
    });

    if (!camp) {
      throw new Error('Camp not found');
    }

    if (camp.hasShirts) {
      if (input.campVariantRegistrations?.some((e) => !e.shirtSize)) {
        throw new Error('Shirt size is required');
      }
    }

    /// TODO: remove when getting meal price from variants
    const campRegistration = await queryRunner.manager.save(CampRegistration, {
      ...input,
    });

    if (!campRegistration) {
      throw new Error('Failed to create camp registration');
    }

    await this.validateChildrenForCamp({
      queryRunner,
      camp,
      parentId: input.parentId,
      campVariantRegistrations: input.campVariantRegistrations,
    });

    /// assign camp to registration
    campRegistration.camp = camp;

    console.log('Camp registration created:', campRegistration.id);

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
        amount: totalVariantsAmount,
        discountAmount: discountAmount,
        paidAmount: new Decimal('0'),
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

  async validateChildrenForCamp({
    queryRunner,
    camp,
    parentId,
    campVariantRegistrations,
  }: {
    queryRunner: QueryRunner;
    parentId: string;
    camp: Camp;
    campVariantRegistrations: CreateCampVariantRegistrationInput[];
  }) {
    if (!camp.ageRanges?.length) return;

    const childIds = Array.from(
      new Set(campVariantRegistrations.map((e) => e.childId)),
    );

    const children = await queryRunner.manager.find(Child, {
      where: {
        id: In(childIds),
      },
    });

    if (children.length !== childIds.length) {
      const missingIds = difference(
        childIds,
        children.map((e) => e.id),
      );
      throw new Error(`Children with ids ${missingIds.join(', ')} not found`);
    }

    if (children.some((e) => e.parentId !== parentId)) {
      throw new Error('Some children do not belong to the parent');
    }

    // validate child age
    for (const variant of campVariantRegistrations) {
      const child = children.find((e) => e.id === variant.childId);
      if (!child) {
        throw new Error(`Child with id ${variant.childId} not found`);
      }

      const maxAge =
        camp.ageRanges.sort((a, b) => b.maxAge - a.maxAge)[0].maxAge ?? 100;
      const minAge =
        camp.ageRanges.sort((a, b) => a.minAge - b.minAge)[0].minAge ?? 0;

      const ageInDays = !child.birthdate
        ? null
        : getDateDifferenceInDays(
            child.birthdate,
            moment.tz('Africa/Cairo').toDate(),
          );

      const age = Math.floor(ageInDays ? ageInDays / 365.25 : 101); // convert days to years

      if (age < minAge || age > maxAge) {
        throw new Error(
          `Child ${child.name} is not eligible for this camp, age: ${age}`,
        );
      }
    }
  }

  async handleCampVariantRegistrations({
    campVariantRegistrations,
    campRegistration,
    queryRunner,
    oneDayPrice,
    existingRegistrations,
    updatedRegistrations,
    discount,
    overwriteExisting = true,
    campVariants,
  }: {
    campVariantRegistrations?: CreateCampVariantRegistrationInput[];
    campRegistration: CampRegistration;
    queryRunner: QueryRunner;
    oneDayPrice?: Decimal;
    existingRegistrations?: CampVariantRegistration[];
    updatedRegistrations?: CampVariantRegistration[];
    discount?: Discount;
    overwriteExisting?: boolean;

    campVariants?: CampVariant[];
  }): Promise<Decimal | null> {
    if (
      !campVariantRegistrations?.length &&
      !existingRegistrations?.length &&
      !updatedRegistrations?.length
    ) {
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
    campVariants ??= await queryRunner.manager.find(CampVariant, {
      where: { id: In(campVariantIds) },
      lock: { mode: 'pessimistic_write' },
    });

    const now = moment.tz('Africa/Cairo');

    for (const cv of campVariants) {
      const endDate = moment(cv.endDate).tz('Africa/Cairo');
      if (endDate.diff(now) <= 0) {
        if (campVariantRegistrations.find((e) => e.campVariantId == cv.id)) {
          throw new Error(`${cv.name} has ended, you can't register`);
        }
      }
    }

    if (!oneDayPrice) {
      if (campVariants.length < campVariantIds.length) {
        throw new Error('Invalid camp variant reference');
      }

      for (const cv of campVariants) {
        if (cv.remainingCapacity < campVariantVacancies.get(cv.id)) {
          throw new Error(`Not enough vacancies for ${cv.name}`);
        }
      }
    }

    let inserts: CampVariantRegistration[] = !campVariantRegistrations?.length
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
              mealPrice: baseMealPrice,
              price: basePrice,
              variantDiscount: priceDiscount,
              mealDiscount: mealDiscount,
            };
          }),
        );

    if (inserts.length !== (campVariantRegistrations?.length ?? 0)) {
      throw new Error('Failed to insert camp variant registrations');
    }

    let totalPrice: Decimal = new Decimal('0');

    const newInsertsPrice = this.calculateCampVariantRegistrationPrice(
      campVariants,
      inserts,
    );

    totalPrice = totalPrice.plus(newInsertsPrice);

    if (existingRegistrations?.length) {
      // update existing registration discounts
      if (discount && overwriteExisting) {
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

      totalPrice = totalPrice.plus(existingPrice);
    }

    if (updatedRegistrations?.length) {
      totalPrice = totalPrice.plus(
        this.calculateCampVariantRegistrationPrice(
          campVariants,
          updatedRegistrations,
        ),
      );
    }

    return oneDayPrice ? oneDayPrice : totalPrice;
  }

  calculateCampVariantRegistrationPrice(
    campVariants: CampVariant[],
    campVariantRegistrations: CampVariantRegistration[],
  ): Decimal {
    let totalPrice = new Decimal('0');

    if (!campVariantRegistrations?.length) {
      return totalPrice;
    }

    for (const registration of campVariantRegistrations) {
      const totalRegistrationPrice = registration.price
        .plus(registration.mealPrice ?? 0)
        .minus(registration.variantDiscount ?? 0)
        .minus(registration.mealDiscount ?? 0);
      totalPrice = totalPrice.plus(totalRegistrationPrice);
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
      relations: ['campVariantRegistrations', 'camp', 'camp.ageRanges'],
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

    if (campRegistration.camp.hasShirts) {
      if (input.campVariantRegistrations?.some((e) => !e.shirtSize)) {
        throw new Error('Shirt size is required');
      }
    }

    await this.validateChildrenForCamp({
      queryRunner,
      camp: campRegistration.camp,
      parentId: userId,
      campVariantRegistrations: input.campVariantRegistrations,
    });

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
        amount: amount,
        discountAmount: discountAmount,
        oneDayPrice: null,
        discountId: discount?.id,
        paidAmount: new Decimal('0'),
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
          behaviorConsent: input.behaviorConsent,
          refundPolicyConsent: input.refundPolicyConsent,
          amount: total,
          paidAmount: new Decimal('0'),
          discountId: null,
          discountAmount: null,
        },
      );

      if (updated.affected !== 1) {
        throw new Error('Failed to update camp registration');
      }

      // reset all payments
      await this.cancelPayments({ campRegistration, queryRunner });

      await this.updateReservations({
        queryRunner,
        campRegistration,
      });

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
          paidAmount: new Decimal('0'),
          paymentMethod: input.paymentMethod,
          oneDayPrice: null,
          amount: price,
          discountId: discount?.id ?? null,
          discountAmount: amountDiscounted,
        },
      );

      if (updated.affected !== 1) {
        throw new Error('Failed to update camp registration');
      }

      // reset all payments
      await this.cancelPayments({ campRegistration, queryRunner });

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

  async findDiscount(
    id: number,
    queryRunner: QueryRunner,
    validate: boolean = true,
  ): Promise<Discount> {
    if (!id) {
      throw new Error('Invalid discount request, missing id');
    }
    const discount = await queryRunner.manager.findOne(Discount, {
      where: { id },
    });

    if (!discount) {
      throw new Error('Discount not found');
    }

    if (validate) {
      const discountEnded =
        moment().tz('Africa/Cairo').diff(discount.endDate) < 0;
      const discountStarted =
        moment().tz('Africa/Cairo').diff(discount.startDate) > 0;

      if (discountEnded || !discountStarted) {
        throw new Error(`Discount is not valid`);
      }
    }
    return discount;
  }

  async paginateCampRegistrations(input: PaginateCampRegistrationsInput) {
    const queryBuilder = this.repo.createQueryBuilder('campRegistration');

    if (input.parentIds?.length) {
      queryBuilder.andWhere('campRegistration.parentId IN (:...parentIds)', {
        parentIds: input.parentIds,
      });
    }

    if (input.campIds?.length) {
      queryBuilder.andWhere('campRegistration.campId IN (:...campIds)', {
        campIds: input.campIds,
      });
    }

    if (input.statuses?.length) {
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
        relations: ['campVariantRegistrations', 'camp', 'payments'],
      });

      if (!campRegistration) {
        throw new Error('Camp registration not found or incomplete');
      }

      if (!campRegistration.campVariantRegistrations?.length) {
        throw Error('Incomplete camp, add at least one week');
      }

      if (campRegistration.status !== CampRegistrationStatus.idle) {
        if (input.discountId) {
          throw new Error(
            'Discounts are not allowed for completed registrations',
          );
        }

        throw new Error(
          'Camp registration already completed, you cannot process it again',
        );
      }

      const paymentMethod =
        input.paymentMethod ?? campRegistration.paymentMethod;

      if (!paymentMethod) throw Error('Select a payment method first');

      if (userType == UserType.admin) {
        if (
          paymentMethod === PaymentMethod.fawry ||
          paymentMethod === PaymentMethod.paymob
        ) {
          throw Error(
            'Admins cannot initiate online payments (fawry/paymob), only parents can',
          );
        }
      }

      //TODO: handle two scenarios
      // first: if payment is secondary and the difference is positive
      // second: if the payment is secondary and the difference is negative

      /// basic case
      /// if this is the first payment

      /// TODO: this is a temp fix, the function is
      /// implemented to work only with idle registrations
      /// that have at least one week registered
      /// it should work with all registrations statuses and phases

      input.refundPolicyConsent = true;
      input.behaviorConsent = true;

      return await this.handleIdlePayment(
        campRegistration,
        queryRunner,
        userId,
        paymentMethod,
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

  async handleFreePayment(
    queryRunner: QueryRunner,
    campRegistration: CampRegistration,
  ) {
    const vacanciesToDeduct: Map<number, number> = new Map();

    console.log('Handling free payment for registration:', campRegistration.id);
    console.log('vacanciesToDeduct:', vacanciesToDeduct);

    for (const variant of campRegistration.campVariantRegistrations) {
      if (vacanciesToDeduct.has(variant.campVariantId)) {
        vacanciesToDeduct.set(
          variant.campVariantId,
          vacanciesToDeduct.get(variant.campVariantId) + 1,
        );
      } else {
        vacanciesToDeduct.set(variant.campVariantId, 1);
      }
    }

    if (!vacanciesToDeduct.size) {
      throw new Error('No camp variants to deduct vacancies from');
    }

    for (const [campVariantId, count] of vacanciesToDeduct.entries()) {
      const update = await queryRunner.manager.increment(
        CampVariant,
        { id: campVariantId },
        'remainingCapacity',
        -count,
      );

      if (update.affected !== 1) {
        throw new Error(
          `Failed to deduct vacancies for variant ${campVariantId}`,
        );
      }
    }

    const updateCamp = await queryRunner.manager.update(
      CampRegistration,
      { id: campRegistration.id },
      {
        status: CampRegistrationStatus.accepted,
      },
    );

    if (updateCamp.affected !== 1) {
      throw new Error('Failed to update camp registration status');
    }

    await queryRunner.manager.delete(RegistrationReserve, {
      campRegistrationId: campRegistration.id,
    });

    await queryRunner.commitTransaction();

    this.mailService.sendCampRegistrationConfirmation(campRegistration.id);

    // update registration status
    return {
      success: true,
      paid: true,
      message: 'Registration completed successfully with free payment',
    };
  }

  async handleIdlePayment(
    campRegistration: CampRegistration,
    queryRunner: QueryRunner,
    userId: string,
    paymentMethod: PaymentMethod,
    input: ProcessCampRegistrationInput,
  ) {
    // validate vacancies
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

    if (
      campRegistration.payments?.some((e) => e.status == PaymentStatus.paid)
    ) {
      throw new Error('Registration already paid');
    }

    const discountId = input.discountId ?? campRegistration.discountId;

    let amountTobePaid = campRegistration.amountDifference();

    let paymentResetted: boolean = false;

    if (discountId) {
      // validate discount
      const discount = await this.findDiscount(discountId, queryRunner);

      if (discount) {
        if (campRegistration.discountId !== discount.id) {
          /// apply discount on registration
          const totalAmount = await this.handleCampVariantRegistrations({
            queryRunner,
            discount,
            campRegistration,
            existingRegistrations: campRegistration.campVariantRegistrations,
          });

          let discountAmount: Decimal = undefined;

          if (discount?.amount) {
            discountAmount = min([totalAmount, discount.amount]);
          }

          const updated = await queryRunner.manager.update(
            CampRegistration,
            { id: campRegistration.id },
            {
              discountId: discount.id,
              discountAmount: discountAmount,
              amount: totalAmount,
            },
          );

          if (updated.affected !== 1) {
            throw new Error('Failed to update camp registration');
          }

          amountTobePaid = totalAmount?.minus(discountAmount ?? 0);

          await this.cancelPayments({ queryRunner, campRegistration });

          console.log('Payment reset due to discount change');

          paymentResetted = true;
        }
      }
    }

    const pendingPayments = paymentResetted
      ? []
      : campRegistration.payments?.filter(
          (e) => e.status == PaymentStatus.pending && !e.parentId,
        );

    // handle free payment
    console.log('Amount to be paid:', amountTobePaid.toString());

    if (amountTobePaid.eq(new Decimal('0'))) {
      console.log('Free payment detected, handling free payment');
      console.log('Pending payments:', pendingPayments);
      if (!paymentResetted) {
        const match = pendingPayments.find((e) => e.amount.eq(amountTobePaid));
        console.log('Match found:', match);
        if (match) {
          if (match.paymentMethod !== PaymentMethod.cash) {
            console.log('Updating existing payment to cash');
            await queryRunner.manager.update(
              RegistrationPayment,
              {
                id: match.id,
              },
              {
                paymentMethod: PaymentMethod.cash,
                status: PaymentStatus.paid,
                receipt: null,
                referenceNumber: null,
                url: null,
                userId: userId,
              },
            );

            return await this.handleFreePayment(queryRunner, campRegistration);
          }
        }
      }

      // create cash payment
      const payment = await queryRunner.manager.insert(RegistrationPayment, {
        campRegistrationId: campRegistration.id,
        amount: amountTobePaid.toFixed(moneyFixation),
        paymentMethod: PaymentMethod.cash,
        status: PaymentStatus.paid,
        userId: userId,
      });

      if (payment.raw.affectedRows !== 1) {
        throw new Error('Failed to create cash payment');
      }

      return await this.handleFreePayment(queryRunner, campRegistration);
    }

    if (
      paymentMethod === PaymentMethod.fawry ||
      paymentMethod === PaymentMethod.paymob
    ) {
      /// Find pending and return of any
      /// Otherwise expire online payment pendings
      if (pendingPayments?.length) {
        const validPayments = pendingPayments.filter(
          (e) =>
            moment().tz('Africa/Cairo').diff(e.expirationDate, 'minutes') < 0,
        );

        console.log('Time now:', moment().tz('Africa/Cairo').toString());
        console.log('Valid payments:', validPayments);
        console.log('Amount to be paid:', amountTobePaid.toString());

        if (validPayments?.length) {
          const validWithAmount = validPayments.find((e) => {
            console.log(
              'Comparing payment amount:',
              e.amount.toString(),
              'with amount to be paid:',
              amountTobePaid.toString(),
            );
            return e.amount.eq(amountTobePaid);
          });
          console.log('Valid payment with amount:', validWithAmount);

          if (validWithAmount) {
            const ids = validPayments.filter(
              (p) => p.id !== validWithAmount.id,
            );

            console.log('Expiring old payments with ids:', ids);

            if (ids?.length) {
              await this.cancelFawryPayments({
                queryRunner,
                campRegistration,
                ids: ids.map((e) => e.id),
              });
            }

            await queryRunner.commitTransaction();

            return {
              success: true,
              payment: validWithAmount,
              expiration: validWithAmount.expirationDate,
            };
          }
        }
      }

      const expiredOnlinePayments = campRegistration.payments?.filter(
        (e) =>
          (e.paymentMethod == PaymentMethod.fawry ||
            e.paymentMethod == PaymentMethod.paymob) &&
          e.status == PaymentStatus.expired &&
          e.amount.eq(amountTobePaid),
      );

      if (expiredOnlinePayments?.length) {
        const newExpiration = moment()
          .tz('Africa/Cairo')
          .add(onlineTTL, 'minute');

        const parent =
          campRegistration.parent ??
          (await queryRunner.manager.findOne(User, {
            where: { id: campRegistration.parentId },
          }));

        let paymentUrl: string;
        let merchantRef: string;

        if (expiredOnlinePayments[0].paymentMethod === PaymentMethod.fawry) {
          const result = await this.generateFawryPaymentUrl(
            campRegistration,
            campRegistration.amount,
            expiredOnlinePayments[0].id,
            parent,
            newExpiration,
          );
          paymentUrl = result.paymentUrl;
          merchantRef = result.merchantRef;
        } else {
          const result = await this.generatePaymobPaymentUrl(
            campRegistration,
            campRegistration.amount,
            expiredOnlinePayments[0].id,
            parent,
          );
          paymentUrl = result.paymentUrl;
          merchantRef = result.merchantRef;
        }

        if (!paymentUrl) {
          throw new Error('Failed to generate new online payment url');
        }

        const expiredPayment = expiredOnlinePayments[0];

        const updatePayment = await queryRunner.manager.update(
          RegistrationPayment,
          { id: expiredPayment.id },
          {
            status: PaymentStatus.pending,
            expirationDate: newExpiration.toDate(),
            referenceNumber: merchantRef,
            url: paymentUrl,
            createdAt: () => 'CURRENT_TIMESTAMP(3)',
          },
        );

        if (updatePayment.affected !== 1) {
          throw new Error('Failed to update online payment');
        }

        expiredPayment.status = PaymentStatus.pending;
        expiredPayment.expirationDate = newExpiration.toDate();
        expiredPayment.referenceNumber = merchantRef;
        expiredPayment.url = paymentUrl;
        expiredPayment.createdAt = new Date();

        if (pendingPayments?.length) {
          await this.cancelPayments({
            queryRunner,
            payments: pendingPayments,
          });
        }

        await queryRunner.commitTransaction();
        return {
          success: true,
          payment: expiredPayment,
          expiration: newExpiration,
        };
      }
    } else {
      if (pendingPayments?.length) {
        const validPayment = pendingPayments?.find(
          (e) =>
            e.paymentMethod === paymentMethod && e.amount.eq(amountTobePaid),
        );

        if (validPayment) {
          const toCancel = pendingPayments.filter(
            (p) => p.id !== validPayment.id,
          );

          await this.cancelPayments({ queryRunner, payments: toCancel });

          await queryRunner.commitTransaction();
          return {
            success: true,
            payment: validPayment,
          };
        } else {
          await this.cancelPayments({
            queryRunner,
            payments: pendingPayments,
            updateReserves: false,
          });
        }
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
      case PaymentMethod.paymob:
        return await this.handlePaymobPayment(
          campRegistration,
          campVariants,
          campVariantVacancies,
          queryRunner,
          userId,
          input,
        );
    }
  }

  async cancelPayments({
    queryRunner,
    campRegistration,
    payments,
    ids = [],
    updateReserves = true,
  }: {
    queryRunner: QueryRunner;
    campRegistration?: CampRegistration;
    payments?: RegistrationPayment[];
    ids?: number[];
    updateReserves?: boolean;
  }) {
    if (!campRegistration && !payments && !ids?.length) {
      throw new Error('No camp registration or payments provided');
    }

    let cancelled: RegistrationPayment[] = [];

    payments ??= await queryRunner.manager.find(RegistrationPayment, {
      where: {
        ...(ids?.length
          ? { id: In(ids) }
          : { campRegistrationId: campRegistration.id }),
        status: PaymentStatus.pending,
        parentId: IsNull(),
      },
    });

    payments = payments.filter((e) => !e.parentId);

    if (!payments?.length) {
      throw new Error('No payments to cancel');
    }

    const fawryPayments = payments.filter(
      (e) => e.paymentMethod === PaymentMethod.fawry,
    );

    const otherPayments = payments.filter(
      (e) => e.paymentMethod !== PaymentMethod.fawry,
    );

    if (fawryPayments?.length) {
      cancelled = await this.cancelFawryPayments({
        queryRunner,
        campRegistration,
        payments: fawryPayments,
        updateReserves: updateReserves,
      });
    }

    if (otherPayments?.length) {
      const expirePayments = await queryRunner.manager.update(
        RegistrationPayment,
        { id: In(otherPayments.map((e) => e.id)) },
        { status: PaymentStatus.expired },
      );

      if (expirePayments.affected !== otherPayments.length) {
        throw Error('Failed to expire all payments');
      }
    }

    return [...fawryPayments, ...otherPayments];
  }

  async cancelFawryPayments({
    queryRunner,
    campRegistration,
    payments,
    ids = [],
    updateReserves = true,
  }: {
    queryRunner: QueryRunner;
    campRegistration?: CampRegistration;
    payments?: RegistrationPayment[];
    ids?: number[];
    updateReserves?: boolean;
  }) {
    if (!campRegistration && !payments && !ids?.length) {
      throw new Error('No camp registration or payments provided');
    }
    payments ??= await queryRunner.manager.find(RegistrationPayment, {
      where: {
        ...(ids?.length
          ? { id: In(ids) }
          : { campRegistrationId: campRegistration?.id }),
        status: PaymentStatus.pending,
        parentId: IsNull(),
      },
    });

    if (!payments?.length) {
      throw new Error('No payments to cancel');
    }

    const failedPayments: RegistrationPayment[] = [];
    for (let payment of payments) {
      const cancelPayments = await cancelPayment(
        payment.referenceNumber,
        'en-gb',
      );
      if (cancelPayments?.code !== '200') {
        failedPayments.push(payment);
      }
    }

    let cancelled = payments.filter((e) => !failedPayments.includes(e));

    if (cancelled?.length) {
      const expirePayments = await queryRunner.manager.update(
        RegistrationPayment,
        { id: In(cancelled.map((e) => e.id)) },
        { status: PaymentStatus.expired },
      );

      if (expirePayments.affected !== cancelled.length) {
        throw Error('Failed to expire all payments');
      }
    }

    if (failedPayments?.length) {
      const failPayments = await queryRunner.manager.update(
        RegistrationPayment,
        { id: In(failedPayments.map((e) => e.id)) },
        { status: PaymentStatus.failed },
      );

      if (failPayments.affected !== cancelled.length) {
        throw Error('Failed to expire all payments');
      }
    }

    if (updateReserves) {
      await this.updateReservations({
        queryRunner,
        campRegistration,
      });
    }

    return [...cancelled, ...failedPayments];
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
          paymentMethod: input.paymentMethod,
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

    const tenMinutesFromNow = moment
      .tz('Africa/Cairo')
      .add(onlineTTL, 'minute');
    // const tenMinutesFromNow = Date.now() + 10 * 60 * 1000;

    const { paymentUrl, merchantRef } = await this.generateFawryPaymentUrl(
      campRegistration,
      totalAmount,
      payment.id,
      parent,
      tenMinutesFromNow,
    );

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

    await this.updateReservations({
      queryRunner,
      campVariantVacancies,
      campRegistration,
      expirationMinutes: 10,
    });

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

  async generateFawryPaymentUrl(
    campRegistration: CampRegistration,
    totalAmount: Decimal,
    paymentId: number,
    parent: User,
    tenMinutesFromNow: moment.Moment,
  ): Promise<{ paymentUrl: string; merchantRef: string }> {
    const merchantRef = generateMerchantRefNumber(paymentId);

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

    return {
      paymentUrl,
      merchantRef,
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

    if (!payment) {
      throw Error('Failed to create payment record');
    }

    const updateCampRegistration = await queryRunner.manager.update(
      CampRegistration,
      {
        id: campRegistration.id,
      },
      {
        paymentMethod,
        status: CampRegistrationStatus.pending,
      },
    );

    if (updateCampRegistration.affected !== 1) {
      throw Error('Failed to update camp registration status');
    }

    await this.updateReservations({
      queryRunner,
      campRegistration,
      campVariantVacancies,
    });

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

  async updateReservations({
    queryRunner,
    campVariantVacancies,
    campRegistration,
    expirationMinutes,
  }: {
    queryRunner: QueryRunner;
    campVariantVacancies?: Map<number, number>;
    campRegistration: CampRegistration;
    expirationMinutes?: number;
  }) {
    const now = moment().tz('Africa/Cairo');

    if (!campVariantVacancies) {
      await queryRunner.manager.delete(RegistrationReserve, {
        campRegistrationId: campRegistration.id,
      });
    }

    const existingReservations = await queryRunner.manager.find(
      RegistrationReserve,
      {
        where: {
          campRegistrationId: campRegistration.id,
        },
      },
    );

    const existingReservationsMap = new Map<number, number>();
    existingReservations.forEach((e) => {
      existingReservationsMap.set(e.campVariantId, e.count);
    });

    const toDelete = existingReservations?.filter((e) => {
      return !campVariantVacancies.has(e.campVariantId);
    });

    const toInsert: [number, number][] = [];

    const toUpdate = Array.from(campVariantVacancies.entries()).filter(
      ([id, count]) => {
        const hasExisting = existingReservationsMap.has(id);
        if (!hasExisting) {
          toInsert.push([id, count]);
          return false;
        }
        return existingReservationsMap.get(id) !== count;
      },
    );
    if (toDelete?.length) {
      const deleteReservations = await queryRunner.manager.delete(
        RegistrationReserve,
        {
          id: In(toDelete.map((e) => e.id)),
        },
      );

      if (deleteReservations.affected !== toDelete.length) {
        throw Error('Failed to delete old reservations');
      }
    }

    if (toUpdate?.length) {
      for (const [variantId, count] of toUpdate) {
        const update = await queryRunner.manager.update(
          RegistrationReserve,
          {
            campRegistrationId: campRegistration.id,
            campVariantId: variantId,
          },
          {
            count,
            expirationDate: expirationMinutes
              ? now.add(onlineTTL, 'milliseconds').toDate()
              : undefined,
          },
        );

        if (update.affected !== 1) {
          throw Error('Failed to update reservation');
        }
      }
    }

    if (toInsert?.length) {
      const insert = await queryRunner.manager.insert(
        RegistrationReserve,
        toInsert.map(([variantId, count]) => ({
          campRegistrationId: campRegistration.id,
          campVariantId: variantId,
          count,
          expirationDate: expirationMinutes
            ? now.add(expirationMinutes, 'minute').toDate()
            : undefined,
        })),
      );

      if (insert.raw.affectedRows !== toInsert.length) {
        throw Error('Failed to insert new reservations');
      }
    }
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
          relations: ['camp', 'campVariantRegistrations'],
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
        /// handle if cash to remove old
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
    let variantsToUpdate: {
      variant: CampVariantRegistration;
      update: UpdateCampVariantRegistrationInput;
    }[] = [];
    let variantsToInsert: CreateCampVariantRegistrationInput[] = [];
    let variantsToDelete: CampVariantRegistration[] = [];
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
            (!variant.withMeal && existing.mealPrice) ||
            (variant.shirtSize && existing.shirtSize !== variant.shirtSize)
          ) {
            variantsToUpdate.push({
              variant: existing,
              update: { id: existing.id, ...variant },
            });
          }
        } else {
          variantsToInsert.push(variant);
        }
      }
    }

    variantsToDelete = existingVariants.filter((e) => {
      return !input.campVariantRegistrations?.find(
        (i) => i.childId == e.childId && i.campVariantId == e.campVariantId,
      );
    });

    existingVariants = existingVariants.filter((e) => {
      return (
        !variantsToUpdate.find((v) => v.variant.id == e.id) &&
        !variantsToDelete.find((v) => v.id == e.id) &&
        !variantsToInsert.find(
          (v) => v.childId == e.childId && v.campVariantId == e.campVariantId,
        )
      );
    });

    if (
      !existingVariants.length &&
      !variantsToInsert.length &&
      !variantsToUpdate.length
    ) {
      throw new Error(
        'Cannot remove all weeks, you can cancel registration instead',
      );
    }

    if (campRegistration.camp.hasShirts) {
      if (variantsToInsert?.some((e) => !e.shirtSize)) {
        throw new Error('Shirt size is required');
      }
      if (variantsToUpdate?.some((e) => !e.update.shirtSize)) {
        throw new Error('Shirt size is required');
      }
    }

    let oldDiscount: Discount = undefined;
    let newDiscount: Discount = null;

    newDiscount =
      input.discountId &&
      (await this.findDiscount(input.discountId, queryRunner, false));

    oldDiscount =
      campRegistration.discountId &&
      (await this.findDiscount(
        campRegistration.discountId,
        queryRunner,
        false,
      ));

    campVariantIds = Array.from(
      new Set([
        ...variantsToUpdate.map((e) => e.variant.campVariantId),
        ...variantsToInsert.map((e) => e.campVariantId),
        ...existingVariants.map((e) => e.campVariantId),
        ...variantsToDelete.map((e) => e.campVariantId),
      ]),
    );

    // console.log('campVariantIds', campVariantIds);
    // console.log('INSERTS');
    // console.table(variantsToInsert);
    // console.log('UPDATES');
    // console.table(variantsToUpdate);
    // console.log('EXISTING');
    // console.table(existingVariants);
    // console.log('DELETES');
    // console.table(variantsToDelete);
    // console.log('oldDiscount', oldDiscount);
    // console.log('newDiscount', newDiscount);

    const campVariants = await queryRunner.manager.find(CampVariant, {
      where: { id: In(campVariantIds) },
      lock: { mode: 'pessimistic_write' },
    });

    if (campVariants.length !== campVariantIds.length) {
      throw new Error('Invalid camp week reference');
    }

    //delete variants
    await this.deleteCampVariantRegistrations(variantsToDelete, queryRunner);

    if (variantsToInsert?.length) {
      const campVariantVacancies = new Map<number, number>();
      for (const variant of variantsToInsert) {
        if (campVariantVacancies.has(variant.campVariantId)) {
          campVariantVacancies.set(
            variant.campVariantId,
            campVariantVacancies.get(variant.campVariantId) + 1,
          );
        } else {
          campVariantVacancies.set(variant.campVariantId, 1);
        }
      }

      await this.updateReservations({
        queryRunner,
        campVariantVacancies,
        campRegistration,
      });
    }

    // first flow
    // no-discount flow
    if (!oldDiscount && !newDiscount) {
      await this.validateVacancies(queryRunner, variantsToInsert, campVariants);

      // update variants
      const updatedVariants = await this.updatePaidCampVariantRegistrations({
        input: variantsToUpdate,
        queryRunner,
        mealPrice: campRegistration.camp.mealPrice,
      });

      if (updatedVariants.length !== variantsToUpdate.length) {
        throw new Error('Failed to update camp variant registrations');
      }

      // insert new variants and get total price
      const newTotalPrice = await this.handleCampVariantRegistrations({
        campVariantRegistrations: variantsToInsert,
        campRegistration,
        queryRunner,
        existingRegistrations: existingVariants,
        updatedRegistrations: updatedVariants,
        overwriteExisting: false,
        campVariants,
      });

      return await this.updateMoneyDifferenceAndOther(
        input,
        campRegistration,
        newTotalPrice,
        variantsToDelete,
        queryRunner,
      );
    }

    // second flow
    if (oldDiscount && !newDiscount) {
      await this.validateVacancies(queryRunner, variantsToInsert, campVariants);

      // update variants
      const updatedVariants = await this.updatePaidCampVariantRegistrations({
        input: variantsToUpdate,
        queryRunner,
        mealPrice: campRegistration.camp.mealPrice,
        discounts: [oldDiscount],
      });

      if (updatedVariants.length !== variantsToUpdate.length) {
        throw new Error('Failed to update camp variant registrations');
      }

      // insert new variants and get total price
      const newTotalPrice = await this.handleCampVariantRegistrations({
        campVariantRegistrations: variantsToInsert,
        campRegistration,
        queryRunner,
        discount: oldDiscount.isValid() ? oldDiscount : null,
        existingRegistrations: existingVariants,
        updatedRegistrations: updatedVariants,
        overwriteExisting: false,
        campVariants,
      });

      return await this.updateMoneyDifferenceAndOther(
        input,
        campRegistration,
        newTotalPrice,
        variantsToDelete,
        queryRunner,
        campVariants,
        oldDiscount,
      );
    }

    // third flow
    if (!oldDiscount && newDiscount) {
      if (!newDiscount.isValid()) {
        throw new Error('Discount is not valid');
      }

      if (newDiscount?.amount) {
        throw new Error(
          'Only Percentage discounts are not allowed for paid registrations',
        );
      }

      if (newDiscount?.percentage) {
        /// apply discount on new camps only
        await this.validateVacancies(
          queryRunner,
          variantsToInsert,
          campVariants,
        );

        /// update variants
        const updatedVariants = await this.updatePaidCampVariantRegistrations({
          input: variantsToUpdate,
          queryRunner,
          mealPrice: campRegistration.camp.mealPrice,
          discounts: [newDiscount],
        });

        if (updatedVariants.length !== variantsToUpdate.length) {
          throw new Error('Failed to update camp variant registrations');
        }

        const newTotalPrice = await this.handleCampVariantRegistrations({
          campVariantRegistrations: variantsToInsert,
          campRegistration,
          queryRunner,
          discount: newDiscount,
          updatedRegistrations: updatedVariants,
          existingRegistrations: existingVariants,
          overwriteExisting: false,
          campVariants,
        });

        return await this.updateMoneyDifferenceAndOther(
          input,
          campRegistration,
          newTotalPrice,
          variantsToDelete,
          queryRunner,
          campVariants,
          newDiscount,
        );
      }

      throw new Error(
        'Unknow error occured, make sure discount is valid with percentage',
      );
    }

    // fourth flow
    // overwrite all
    if (oldDiscount?.isValid() && newDiscount) {
      if (oldDiscount.id !== newDiscount.id) {
        throw Error('Cannot add new discount, old discount is still valid');
      }
    }

    // update variants
    const updatedVariants = await this.updatePaidCampVariantRegistrations({
      input: variantsToUpdate,
      queryRunner,
      mealPrice: campRegistration.camp.mealPrice,
      discounts: [newDiscount],
      overwrite: true,
    });

    if (updatedVariants.length !== variantsToUpdate.length) {
      throw new Error('Failed to update camp variant registrations');
    }

    // insert new variants and get total price
    const newTotalPrice = await this.handleCampVariantRegistrations({
      campVariantRegistrations: variantsToInsert,
      campRegistration,
      queryRunner,
      discount: newDiscount,
      existingRegistrations: existingVariants,
      updatedRegistrations: updatedVariants,
      overwriteExisting: true,
      campVariants,
    });

    return await this.updateMoneyDifferenceAndOther(
      input,
      campRegistration,
      newTotalPrice,
      variantsToDelete,
      queryRunner,
      campVariants,
      newDiscount,
    );
  }

  async updatePaidCampVariantRegistrations({
    input,
    queryRunner,
    mealPrice,
    discounts,
    overwrite = false,
  }: {
    input: {
      variant: CampVariantRegistration;
      update: UpdateCampVariantRegistrationInput;
    }[];
    queryRunner: QueryRunner;
    mealPrice?: Decimal;
    discounts?: Discount[];
    overwrite?: boolean;
  }): Promise<CampVariantRegistration[]> {
    if (!input?.length) return [];

    let updatedVariants: CampVariantRegistration[] = [];

    for (const { variant, update } of input) {
      //TODO: should apply this in the discount only for old variants...
      // should validate each discount first before aaplying

      variant.discountId;
      // find appropriate discount
      let discount = overwrite
        ? discounts[0]
        : discounts?.find((e) => e.id == variant.discountId);
      if (!discount && variant.discountId) {
        discount = await this.findDiscount(
          variant.discountId,
          queryRunner,
          false,
        );
        if (!discount) {
          throw new Error(
            'Discount not found for camp week, make sure the discount still exists',
          );
        }
        discounts.push(discount);
      }

      const basePrice = variant.price;
      const baseMealPrice = update.withMeal ? mealPrice : null;

      let priceDiscount: Decimal = null;
      let mealDiscount: Decimal = null;
      if (discount && discount.percentage) {
        if (discount.percentage) {
          priceDiscount = min([
            discount.percentage.multipliedBy(basePrice),
            discount.maximumDiscount,
          ]);

          mealDiscount = baseMealPrice
            ? min([
                discount.percentage.multipliedBy(baseMealPrice),
                discount.maximumDiscount,
              ])
            : null;
        }
      }

      // handle update
      let newVariant: CampVariantRegistration = {
        ...variant,
        shirtSize: update.shirtSize,
        discountId: discount?.id ?? null,
        price: basePrice,
        variantDiscount: priceDiscount,
        mealPrice: baseMealPrice,
        mealDiscount: mealDiscount,
      };

      const updateVariant = await queryRunner.manager.save(
        CampVariantRegistration,
        newVariant,
      );

      if (!updateVariant) {
        throw new Error('Failed to update camp variant registration');
      }
      updatedVariants.push(updateVariant);
    }

    return updatedVariants;
  }

  calculateRefundPenalty(
    difference: Decimal,
    campVariants: CampVariant[],
    variantsToDelete?: CampVariantRegistration[],
  ): Decimal {
    if (difference.isEqualTo(0) || !variantsToDelete?.length)
      return new Decimal('0');

    let penaltyFees = new Decimal('0');

    const now = moment().tz('Africa/Cairo');

    for (const variant of variantsToDelete) {
      const campVariant = campVariants.find(
        (e) => e.id == variant.campVariantId,
      );
      if (!campVariant) {
        throw new Error('Invalid camp week reference (910)');
      }

      const weekPrice = variant.price
        .plus(variant.mealPrice ?? new Decimal('0'))
        .minus(variant.variantDiscount ?? new Decimal('0'))
        .minus(variant.mealDiscount ?? new Decimal('0'));

      const differenceInDays = now.diff(campVariant.startDate, 'days');

      if (!now.isBefore(campVariant.startDate) || differenceInDays <= 7) {
        penaltyFees = weekPrice;
      } else if (differenceInDays <= 14) {
        penaltyFees = weekPrice.multipliedBy(0.5);
      } else if (differenceInDays <= 21) {
        penaltyFees = weekPrice.multipliedBy(0.75);
      }
    }

    return penaltyFees;
  }

  async updateMoneyDifferenceAndOther(
    input: UpdateCampRegistrationInput,
    campRegistration: CampRegistration,
    newTotalPrice: Decimal,
    variantsToDelete: CampVariantRegistration[],
    queryRunner: QueryRunner,
    campVariants?: CampVariant[],
    discount?: Discount,
  ) {
    /// get total of paid amount

    const paidAmount = await getSumOfPaidAmounts(
      campRegistration.id,
      queryRunner,
    );

    const discountAmount = discount?.amount ?? new Decimal('0');

    newTotalPrice = newTotalPrice?.minus(discountAmount); /// for camps with discount
    const difference = newTotalPrice.minus(paidAmount);

    const additionalPenaltyFees = this.calculateRefundPenalty(
      difference,
      campVariants,
      variantsToDelete,
    );

    const newStatus = difference.isLessThanOrEqualTo(0)
      ? CampRegistrationStatus.accepted
      : CampRegistrationStatus.pending;

    const updateCampRegistration = await queryRunner.manager.update(
      CampRegistration,
      { id: campRegistration.id },
      {
        refundPolicyConsent: input.refundPolicyConsent,
        behaviorConsent: input.behaviorConsent,
        discountId: discount?.id,
        status: newStatus,
        discountAmount: discountAmount,
        amount: newTotalPrice,
        paidAmount: paidAmount,
        penaltyFees: () =>
          `penaltyFees + ${additionalPenaltyFees?.toFixed(moneyFixation) ?? 0}`,
      },
    );

    if (updateCampRegistration.affected !== 1) {
      throw new Error('Failed to update camp registration');
    }

    await queryRunner.commitTransaction();
    return {
      success: true,
      message: 'Camp registration updated successfully',
      data: {
        totalAmount: newTotalPrice?.toFixed(moneyFixation),
        paidAmount: paidAmount?.toFixed(moneyFixation),
        amountToBePaid: difference?.toFixed(moneyFixation),
      },
    };
  }

  /// delete variant and return vacancies
  async deleteCampVariantRegistrations(
    variantsToDelete: CampVariantRegistration[],
    queryRunner: QueryRunner,
  ) {
    if (!variantsToDelete?.length) return;

    const campVariantIds = Array.from(
      new Set(variantsToDelete.map((e) => e.campVariantId)),
    );

    for (const cv of campVariantIds) {
      const count = variantsToDelete.filter(
        (e) => e.campVariantId == cv,
      ).length;
      const update = await queryRunner.manager.update(
        CampVariant,
        { id: cv },
        {
          remainingCapacity: () => `remainingCapacity + ${count}`,
        },
      );
      if (update.affected !== 1) {
        throw new Error('Failed to update camp variant registration');
      }
    }

    const deletedVariants = await queryRunner.manager.delete(
      CampVariantRegistration,
      {
        id: In(variantsToDelete.map((e) => e.id)),
      },
    );

    if (deletedVariants.affected !== variantsToDelete.length) {
      throw new Error('Failed to delete camp variant registrations');
    }
  }

  /// validate if there are enough vacancies
  async validateVacancies(
    queryRunner: QueryRunner,
    campVariantRegistrations?: CreateCampVariantRegistrationInput[],
    existingCampVariants?: CampVariant[],
  ): Promise<Map<number, number> | null> {
    if (!campVariantRegistrations?.length) return null;
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
    const campVariants =
      existingCampVariants ??
      (await queryRunner.manager.find(CampVariant, {
        where: { id: In(campVariantIds) },
        lock: { mode: 'pessimistic_write' },
      }));

    if (campVariants.length < campVariantIds.length) {
      throw new Error('Invalid camp week reference');
    }

    for (const cv of campVariants) {
      if (campVariantVacancies.get(cv.id) > cv.remainingCapacity) {
        throw new Error(`Not enough vacancies for ${cv.name} (${cv.campId})`);
      }
    }

    return campVariantVacancies;
  }

  async rejectCampRegistration(campRegistrationId: number) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const campRegistration = await queryRunner.manager.findOne(
        CampRegistration,
        {
          where: { id: campRegistrationId },
          relations: ['campVariantRegistrations', 'camp'],
        },
      );

      if (!campRegistration) {
        throw new Error('Camp registration not found');
      }

      if (
        campRegistration.status !== CampRegistrationStatus.pending &&
        campRegistration.status !== CampRegistrationStatus.idle
      ) {
        throw new Error('Camp registration already processed');
      }

      const update = await queryRunner.manager.update(
        CampRegistration,
        { id: campRegistration.id },
        { status: CampRegistrationStatus.rejected },
      );

      if (update.affected !== 1) {
        throw new Error('Failed to update camp registration status');
      }

      // expire all pending payments
      const payments = await queryRunner.manager.find(RegistrationPayment, {
        where: {
          campRegistrationId: campRegistration.id,
          status: PaymentStatus.pending,
          parentId: IsNull(),
        },
      });

      if (payments?.length) {
        const reject = await queryRunner.manager.update(
          RegistrationPayment,
          { id: In(payments.map((e) => e.id)) },
          {
            status: PaymentStatus.rejected,
          },
        );

        if (reject.affected !== payments.length) {
          throw new Error('Failed to reject camp registration payments');
        }
      }

      // delete all reservations
      await queryRunner.manager.delete(RegistrationReserve, {
        campRegistrationId: campRegistration.id,
      });

      await queryRunner.commitTransaction();
      return {
        success: true,
        message: 'Camp registration rejected successfully',
      };
    } catch (e) {
      await queryRunner.rollbackTransaction();
      console.log(e);
      return { success: false, message: e.message };
    } finally {
      queryRunner.release();
    }
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

      const amountToBePaid = campRegistration.amountDifference();

      if (!input.paidAmount.eq(amountToBePaid)) {
        throw new Error(
          'Paid amount is not equal to the total amount to be paid',
        );
      }

      const paymentMethod =
        input.paymentMethod ?? campRegistration.paymentMethod;

      if (
        input.paymentMethod == PaymentMethod.instapay &&
        (!input.receipt || !input.referenceNumber)
      ) {
        throw new Error(
          'Receipt & reference number are required for Instapay payment',
        );
      }

      if (!campRegistration) {
        throw new Error('Camp registration not found or incomplete');
      }

      if (campRegistration.status !== CampRegistrationStatus.pending) {
        throw new Error('Camp registration already processed');
      }

      if (campRegistration.refundPolicyConsent === false) {
        throw new Error('Refund policy consent is required');
      }

      if (
        paymentMethod === PaymentMethod.fawry ||
        paymentMethod === PaymentMethod.paymob
      ) {
        throw new Error(
          'Online payments (fawry/paymob) are not supported for manual confirmation',
        );
      }

      const payments = await queryRunner.manager.find(RegistrationPayment, {
        where: {
          campRegistrationId: campRegistration.id,
          status: PaymentStatus.pending,
          parentId: IsNull(),
        },
        lock: { mode: 'pessimistic_write' },
      });

      let payment: RegistrationPayment = payments[0];

      if (payments?.length > 1) {
        throw new Error('Invalid number of pending payments');
      }

      /// Either one or zero payments
      if (payments?.length === 1) {
        /// Handle singl payment
        if (
          input.paymentMethod &&
          input.paymentMethod !== payment.paymentMethod
        ) {
          await this.cancelPayments({
            queryRunner,
            payments: [payment],
            updateReserves: false,
          });

          payment = undefined;
        } else {
          if (!payment.amount.eq(amountToBePaid)) {
            throw new Error(
              'Invoice amount is not equal to the total amount to be paid',
            );
          }
        }
      } else {
        /// Handle no payment
        if (!input.paymentMethod) {
          throw new Error(
            'Payment method is required, current registration is still idle',
          );
        }
      }

      let receipt: string = undefined;

      if (input.receipt) {
        const response = await this.awsService.uploadSingleFileFromBase64({
          base64File: input.receipt.base64,
          fileName: input.receipt.name,
          isPublic: true,
        });

        if (!response.success || !response.key) {
          throw Error('Failed to upload receipt');
        }

        receipt = response.key;
      }

      const reservations = await queryRunner.manager.find(RegistrationReserve, {
        where: { campRegistrationId: campRegistration.id },
      });

      if (!reservations?.length) {
        throw Error('No reservation found');
      }

      const campVariantIds = reservations.map((e) => e.campVariantId);

      // Lock the CampVariant records
      const campVariants = await queryRunner.manager.find(CampVariant, {
        where: { id: In(campVariantIds) },
        lock: { mode: 'pessimistic_write' },
      });

      // Validate if there are enough vacancies
      for (const cv of campVariants) {
        const count =
          reservations.find((e) => e.campVariantId === cv.id)?.count ?? 3000; /// this 3000 is to make sure if there is an issue, the process should fail
        if (cv.remainingCapacity < count) {
          throw new Error(`Not enough vacancies for ${cv.name}`);
        }
      }

      /// handle payment

      if (payment) {
        const updatePayment = await queryRunner.manager.update(
          RegistrationPayment,
          { id: payment.id },
          {
            status: PaymentStatus.paid,
            receipt,
            referenceNumber: input.referenceNumber,
          },
        );

        if (updatePayment.affected !== 1) {
          throw new Error('Failed to update registration payment');
        }
      } else {
        payment = await queryRunner.manager.save(RegistrationPayment, {
          campRegistrationId: campRegistration.id,
          amount: amountToBePaid.toFixed(moneyFixation),
          paymentMethod,
          userId,
          receipt,
          referenceNumber: input.referenceNumber,
          status: PaymentStatus.paid,
        });

        if (!payment) {
          throw Error('Failed to create payment record');
        }
      }

      // find all paid amount
      const paidAmount = await getSumOfPaidAmounts(
        campRegistration.id,
        queryRunner,
      );

      if (!paidAmount.eq(amountToBePaid.plus(campRegistration.paidAmount))) {
        throw Error(
          'Actual paid amount and amount expected to be paid do not match',
        );
      }

      // handle campRegistration
      const updateCampRegistration = await queryRunner.manager.update(
        CampRegistration,
        { id: campRegistration.id },
        {
          status: CampRegistrationStatus.accepted,
          paymentMethod,
          paidAmount: paidAmount,
        },
      );

      if (updateCampRegistration.affected !== 1) {
        throw new Error('Failed to update camp registration');
      }

      // deduct vacancies
      for (const { campVariantId, count } of reservations) {
        const update = await queryRunner.manager.update(
          CampVariant,
          { id: campVariantId },
          { remainingCapacity: () => `remainingCapacity - ${count}` },
        );
        if (update.affected !== 1) {
          const campVariant = campVariants.find((e) => e.id == campVariantId);
          throw Error(
            `Failed to deduct capacity from ${campVariant.name} (${campRegistration.id})`,
          );
        }
      }

      // delete reservations
      const deleteReservations = await queryRunner.manager.delete(
        RegistrationReserve,
        {
          campRegistrationId: campRegistration.id,
        },
      );
      if (deleteReservations.affected !== reservations.length) {
        throw new Error('Failed to delete old reservations');
      }

      await queryRunner.commitTransaction();

      this.mailService.sendCampRegistrationConfirmation(campRegistration.id);

      return {
        success: true,
        message: 'Camp Registration confirmed & paid successfully',
      };
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

  async campRegistrationRefundOptions(
    input: CampRegistrationRefundOptionsInput,
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const campRegistration = await queryRunner.manager.findOne(
        CampRegistration,
        {
          where: { id: input.CampRegistrationId },
          relations: [
            'campVariantRegistrations',
            'camp',
            'campVariantRegistrations.campVariant',
          ],
        },
      );

      if (!campRegistration) {
        throw new Error('Camp registration not found or incomplete');
      }

      const amountToBeRefunded = campRegistration.amountDifference();

      if (amountToBeRefunded.isGreaterThanOrEqualTo(0)) {
        throw new Error('Registration has no amount to be refunded');
      }

      const payments = await queryRunner.manager.find(RegistrationPayment, {
        where: {
          campRegistrationId: campRegistration.id,
          status: PaymentStatus.paid,
          amount: MoreThan(0),
          parentId: IsNull(),
        },
        relations: ['childPayments'],
        lock: { mode: 'pessimistic_write' },
      });

      const validPayments: {
        payment: RegistrationPayment;
        amount: Decimal;
      }[] = [];

      if (payments?.length) {
        for (const payment of payments) {
          // if has child payments
          if (payment.childPayments?.length) {
            // calculate total in negative
            const childPaymentsTotal = payment.childPayments.reduce(
              (acc, childPayment) =>
                childPayment.amount.isNegative()
                  ? acc.plus(childPayment.amount)
                  : 0,
              new Decimal('0'),
            );
            // subtract and get difference
            const difference = payment.amount.plus(childPaymentsTotal);
            if (difference.isGreaterThan(0)) {
              validPayments.push({ payment, amount: difference });
            }
          } else {
            validPayments.push({ payment, amount: payment.amount });
          }
        }
      }

      validPayments.sort((a, b) => {
        if (a.payment.paymentMethod === b.payment.paymentMethod) {
          return a.amount.isLessThan(b.amount) ? -1 : 1;
        } else {
          const aIsOnline =
            a.payment.paymentMethod === PaymentMethod.fawry ||
            a.payment.paymentMethod === PaymentMethod.paymob;
          const bIsOnline =
            b.payment.paymentMethod === PaymentMethod.fawry ||
            b.payment.paymentMethod === PaymentMethod.paymob;

          if (aIsOnline && !bIsOnline) {
            return -1; // a is online, b is not - prioritize a
          } else if (!aIsOnline && bIsOnline) {
            return 1; // b is online, a is not - prioritize b
          } else {
            // Both are online or both are offline - use normal comparison
            return a.amount.isLessThan(b.amount) ? -1 : 1;
          }
        }
      });

      let remRefund = amountToBeRefunded;
      const refundOptions: RefundOption[] = [];

      do {
        const payment = validPayments.pop();

        if (!payment) {
          if (remRefund.isLessThan(0)) {
            throw new Error('Not enough payments to refund');
          }
        }

        console.log('Remaining refund: ', remRefund.toFixed(2));
        console.log('PAYNMNT: ', payment);

        const amount = payment?.amount.isLessThan(remRefund.multipliedBy(-1))
          ? payment?.amount
          : remRefund;

        refundOptions.push({
          amount,
          paymentId: payment.payment.id,
          paymentProviderRef: payment.payment.paymentProviderRef ?? null,
          paymentMethod: payment.payment.paymentMethod,
        });

        remRefund = remRefund.plus(amount);
      } while (remRefund.isLessThan(0));

      const payload = {
        campRegistrationId: campRegistration.id,
        amountToBeRefunded,
        refundOptions,
        nonce: uuid(),
        iat: campRegistration.lastModified,
      };

      const encryptedPayload = this.encryptionService.encrypt(payload);

      await queryRunner.commitTransaction();
      return {
        success: true,
        message: 'Refund options retrieved successfully',
        data: {
          amountToBeRefunded: amountToBeRefunded.toFixed(moneyFixation),
          refundOptions,
          key: encryptedPayload,
        },
      };
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

  async processCampRegistrationRefund(
    input: ProcessCampRegistrationRefundInput,
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const decryptedPayload: RefundPayload = parseRefundPayload(
        this.encryptionService.decrypt(input.key),
      );
      if (
        !decryptedPayload ||
        !decryptedPayload.campRegistrationId ||
        !decryptedPayload.refundOptions ||
        !decryptedPayload.nonce ||
        !decryptedPayload.amountToBeRefunded ||
        !decryptedPayload.iat
      ) {
        throw new Error('Invalid request');
      }

      const campRegistration = await queryRunner.manager.findOne(
        CampRegistration,
        {
          where: { id: decryptedPayload.campRegistrationId },
          lock: { mode: 'pessimistic_write' },
        },
      );

      if (!campRegistration) {
        throw new Error('Camp registration not found');
      }

      if (
        campRegistration.lastModified.getTime() -
          decryptedPayload.iat.getTime() !==
        0
      ) {
        throw new Error('Expired refund request');
      }

      for (const option of decryptedPayload.refundOptions) {
        if (option.paymentMethod === PaymentMethod.fawry) {
          if (!option.paymentProviderRef) {
            throw new Error(
              `Malformed fawry refund request ${option.paymentId}`,
            );
          }
          const refundResponse = await requestRefund({
            refundAmount: option.amount.toFixed(moneyFixation),
            fawryReferenceNumber: option.paymentProviderRef,
          });

          if (refundResponse?.statusCode !== 200) {
            throw new Error(
              `Failed to process fawry refund request ${option.paymentId} (${refundResponse?.statusCode ?? -100}) - ${refundResponse?.statusDescription ?? 'Unknown error'}`,
            );
          }
        } else if (option.paymentMethod === PaymentMethod.paymob) {
          if (!option.paymentProviderRef) {
            throw new Error(
              `Malformed paymob refund request ${option.paymentId}`,
            );
          }

          const refundResponse = await requestPaymobRefund({
            transaction_id: option.paymentProviderRef,
            amount_cents: Math.round(option.amount.toNumber() * 100).toString(),
          });

          if (!refundResponse.success) {
            throw new Error(
              `Failed to process paymob refund request ${option.paymentId}`,
            );
          }
        }

        const payment = await queryRunner.manager.insert(RegistrationPayment, {
          campRegistrationId: campRegistration.id,
          amount: option.amount,
          paymentMethod: option.paymentMethod,
          status:
            option.paymentMethod === PaymentMethod.fawry ||
            option.paymentMethod === PaymentMethod.paymob
              ? PaymentStatus.paid
              : PaymentStatus.pending,
          parentId: option.paymentId,
        });

        if (!payment) {
          throw new Error(
            `Failed to log refund payment ${option.paymentId} (${option.amount})`,
          );
        }
      }

      const paidAmount = await getSumOfPaidAmounts(
        campRegistration.id,
        queryRunner,
      );

      const updateCampRegistration = await queryRunner.manager.update(
        CampRegistration,
        { id: campRegistration.id },
        {
          paidAmount: paidAmount,
        },
      );

      if (updateCampRegistration.affected !== 1) {
        throw new Error('Failed to update camp registration');
      }

      await queryRunner.commitTransaction();
      return {
        success: true,
        message: 'Refund processed successfully',
        data: decryptedPayload,
      };
    } catch (e) {
      await queryRunner.rollbackTransaction();
      console.log(e);
      return {
        success: false,
        message: e.message ?? 'Invalid payload',
      };
    } finally {
      queryRunner.release();
    }
  }

  async completeRegistrationRefund(input: CompleteRegistrationRefundInput) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const payment = await queryRunner.manager.findOne(RegistrationPayment, {
        where: { id: input.paymentId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!payment) {
        throw new Error('Payment not found');
      }

      if (payment.status !== PaymentStatus.pending) {
        throw new Error('Payment already processed');
      }

      if (
        ![PaymentMethod.cash, PaymentMethod.instapay].includes(
          payment.paymentMethod,
        )
      ) {
        throw new Error('Invalid payment method');
      }

      const uploadedImage = await this.awsService.uploadSingleFileFromBase64({
        base64File: input.receipt.base64,
        fileName: input.receipt.name,
        isPublic: true,
      });

      if (!uploadedImage.success || !uploadedImage.key) {
        throw new Error('Failed to upload receipt');
      }

      const update = await queryRunner.manager.update(
        RegistrationPayment,
        { id: payment.id },
        {
          receipt: uploadedImage.key,
          status: PaymentStatus.paid,
        },
      );

      if (update.affected !== 1) {
        throw new Error('Failed to update payment status');
      }

      const paidAmount = await getSumOfPaidAmounts(
        payment.campRegistrationId,
        queryRunner,
      );

      const updateCampRegistration = await queryRunner.manager.update(
        CampRegistration,
        { id: payment.campRegistrationId },
        {
          paidAmount: paidAmount,
        },
      );

      if (updateCampRegistration.affected !== 1) {
        throw new Error('Failed to update camp registration');
      }

      await queryRunner.commitTransaction();
      return {
        success: true,
        message: 'Refund completed successfully',
      };
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

  async cancelRegistrations({
    queryRunner,
    registrationIds = [],
    registrations = [],
  }: {
    queryRunner: QueryRunner;
    registrationIds?: number[];
    registrations?: CampRegistration[];
  }) {
    if (!registrations?.length) {
      if (!registrationIds?.length) {
        throw new Error('No registrations found to cancel');
      }

      registrations = await queryRunner.manager.find(CampRegistration, {
        where: { id: In(registrationIds) },
        relations: ['campVariantRegistrations'],
      });

      if ((registrations?.length ?? 0) !== registrationIds.length) {
        throw new Error('Some registrations not found');
      }
    }

    if (!registrations?.length) {
      throw new Error('No registrations found to cancel');
    }

    if (
      registrations.some(
        (e) =>
          ![
            CampRegistrationStatus.idle,
            CampRegistrationStatus.pending,
          ].includes(e.status),
      )
    ) {
      throw new Error(
        'Cannot cancel registrations that are not in idle or pending status, please cancel them manually',
      );
    }

    const campVariantIds = Array.from(
      new Set(
        registrations.flatMap((e) =>
          e.campVariantRegistrations.map((cv) => cv.campVariantId),
        ),
      ),
    );

    const campVariants = await queryRunner.manager.find(CampVariant, {
      where: { id: In(campVariantIds) },
      lock: { mode: 'pessimistic_write' },
    });

    const vacanciesToRelease = new Map<number, number>();
    for (const registration of registrations) {
      if (
        registration.status === CampRegistrationStatus.pending &&
        (registration.paymentMethod == PaymentMethod.fawry ||
          registration.paymentMethod == PaymentMethod.paymob)
      ) {
        for (const variant of registration.campVariantRegistrations) {
          if (!vacanciesToRelease.has(variant.campVariantId)) {
            vacanciesToRelease.set(variant.campVariantId, 1);
          } else {
            vacanciesToRelease.set(
              variant.campVariantId,
              vacanciesToRelease.get(variant.campVariantId) + 1,
            );
          }
        }
      }
    }

    if (vacanciesToRelease.size > 0) {
      for (const [campVariantId, count] of vacanciesToRelease.entries()) {
        const update = await queryRunner.manager.update(
          CampVariant,
          { id: campVariantId },
          { remainingCapacity: () => `remainingCapacity + ${count}` },
        );
        if (update.affected !== 1) {
          const campVariant = campVariants.find((e) => e.id == campVariantId);
          throw Error(
            `Failed to release capacity for ${campVariant.name} (${campVariant.id})`,
          );
        }
      }
    }

    const deleteReserves = await queryRunner.manager.delete(
      RegistrationReserve,
      {
        campRegistrationId: In(registrations.map((e) => e.id)),
      },
    );

    /// check if reserves deleted

    const zero = new Decimal('0');
    const cancelRegistrations = await queryRunner.manager.update(
      CampRegistration,
      { id: In(registrations.map((e) => e.id)) },
      {
        status: CampRegistrationStatus.cancelled,
        paidAmount: zero,
        amount: zero,
        discountId: null,
        discountAmount: zero,
        penaltyFees: zero,
        refundPolicyConsent: false,
        behaviorConsent: false,
        paymentMethod: null,
      },
    );

    if (cancelRegistrations.affected !== registrations.length) {
      throw new Error('Failed to cancel some registrations');
    }

    // delete camp variant registrations

    const deleteVariants = await queryRunner.manager.delete(
      CampVariantRegistration,
      {
        campRegistrationId: In(registrations.map((e) => e.id)),
      },
    );

    if (
      deleteVariants.affected !==
      registrations.map((e) => e.campVariantRegistrations).flat().length
    ) {
      throw new Error('Failed to delete some camp variant registrations');
    }
  }

  setPaymentTimoout(paymentId: number) {
    const timeout = onlineTTL + 1 * 60 * 1000; // 1 minute more than the online TTL
    setTimeout(async () => {
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        const payment = await queryRunner.manager.findOne(RegistrationPayment, {
          where: { id: paymentId },
          relations: ['campRegistration', 'campVariantRegistrations'],
          lock: { mode: 'pessimistic_write' },
        });

        if (!payment) {
          throw new Error('No payment found');
        }

        if (payment.status !== PaymentStatus.pending) {
          throw new Error('Payments already processed');
        }

        if (payment.paymentMethod === PaymentMethod.fawry) {
          await this.cancelFawryPayments({
            queryRunner,
            payments: [payment],
          });
        } else {
          // For other payment methods, just expire them
          await queryRunner.manager.update(
            RegistrationPayment,
            { id: payment.id },
            { status: PaymentStatus.expired },
          );
        }

        const vacancies: Map<number, number> = new Map();

        for (const variant of payment.campRegistration
          .campVariantRegistrations) {
          const count = vacancies.get(variant.campVariantId) ?? 0;
          vacancies.set(variant.campVariantId, count + 1);
        }

        try {
          await this.updateReservations({
            queryRunner,
            campVariantVacancies: vacancies,
            campRegistration: payment.campRegistration,
          });
        } catch (e) {
          console.log(e);
          await queryRunner.manager.delete(RegistrationReserve, {
            campRegistrationId: payment.campRegistration.id,
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

  async test(code?: string) {
    return this.encryptionService.decrypt(code);
    const campRegistration = await this.repo.findOne({
      where: { status: CampRegistrationStatus.accepted },
      relations: [
        'camp',
        'campVariantRegistrations',
        'parent',
        'campVariantRegistrations.child',
        'campVariantRegistrations.campVariant',
      ],
    });

    if (!campRegistration) {
      throw new Error('Camp registration not found');
    }

    const data = await generateCampRegistrationEmail({
      registration: campRegistration,
      code: code ?? this.getCode(campRegistration),
    });
    const response = await this.mailService.sendMail({
      to: 'steveroseik@gmail.com',
      subject: 'New Camp Registration',
      text: 'Helloo',
      html: data.content,
      attachments: [data.attachment],
    });

    return response;
  }

  getCode(campRegistration: CampRegistration) {
    return `R${campRegistration.id}${campRegistration.parentId.substring(0, 2).toUpperCase()}`;
  }

  async validateCode(token: string, withAttendance: boolean) {
    try {
      const {
        parentPartialId,
        campRegistrationId,
      }: { parentPartialId: string; campRegistrationId: number } =
        parseCampRegCode(token);

      if (!parentPartialId || !campRegistrationId) {
        throw Error('Invalid token');
      }

      if (withAttendance) {
        const campRegistration = await this.repo.findOne({
          where: { id: campRegistrationId },
          relations: [
            'campVariantRegistrations',
            'campVariantRegistrations.campVariant',
          ],
        });

        if (
          !campRegistration ||
          campRegistration.parentId.substring(0, 2).toUpperCase() !==
            parentPartialId.toUpperCase() ||
          !campRegistration.campVariantRegistrations?.length ||
          campRegistration.status !== CampRegistrationStatus.accepted
        ) {
          throw Error('Invalid camp registration');
        }

        const existingAttendances = await this.dataSource.manager.count(
          RegistrationAttendance,
          {
            where: {
              campRegistrationId: campRegistration.id,
            },
          },
        );

        const remainingAttendances =
          campRegistration.campVariantRegistrations
            .map(
              (e) =>
                getDateDifferenceInDays(
                  e.campVariant.startDate,
                  e.campVariant.endDate,
                ) + 1,
            )
            .reduce((acc, count) => acc + count, 0) - existingAttendances;

        const children = await this.dataSource.manager.find(Child, {
          where: {
            parentId: campRegistration.parentId,
          },
        });

        return {
          success: true,
          message: 'Token is valid',
          data: {
            parentId: campRegistration.parentId,
            campRegistrationId,
            remainingAttendances,
            children,
          },
        };
      }

      return {
        success: true,
        message: 'Token is valid',
      };
    } catch (e) {
      console.log(e);
      return {
        success: false,
        message: e.message,
      };
    }
  }

  async handlePaymobPayment(
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
          paymentMethod: input.paymentMethod,
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
      paymentMethod: PaymentMethod.paymob,
      userId,
    });

    if (!payment) {
      throw Error('Failed to create payment record');
    }

    const tenMinutesFromNow = moment.tz('Africa/Cairo').add(10, 'minute');

    const { paymentUrl, merchantRef } = await this.generatePaymobPaymentUrl(
      campRegistration,
      totalAmount,
      payment.id,
      parent,
    );

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

    await this.updateReservations({
      queryRunner,
      campVariantVacancies,
      campRegistration,
      expirationMinutes: 10,
    });

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

  async generatePaymobPaymentUrl(
    campRegistration: CampRegistration,
    totalAmount: Decimal,
    paymentId: number,
    parent: User,
  ): Promise<{ paymentUrl: string; merchantRef: string }> {
    const merchantRef = generateMerchantRefNumber(paymentId);

    const payload = {
      amount: Math.round(totalAmount.toNumber() * 100), // Convert to cents
      currency: 'EGP',
      payment_methods: [parseInt(process.env.PAYMOB_INTEGRATION_ID)],
      items: [
        {
          name: `Camp Registration - ${campRegistration.id}`,
          amount: Math.round(totalAmount.toNumber() * 100), // Convert to cents
          description: 'Camp Registration Payment',
          quantity: 1,
        },
      ],
      billing_data: {
        apartment: 'N/A',
        first_name: parent.name.split(' ')[0] || parent.name,
        last_name: parent.name.split(' ').slice(1).join(' ') || 'N/A',
        street: 'N/A',
        building: 'N/A',
        phone_number: parent.phone,
        city: 'N/A',
        country: 'EGY',
        email: parent.email,
        floor: 'N/A',
        state: 'N/A',
      },
      special_reference: merchantRef,
      expiration: 10 * 60,
      notification_url: `${process.env.BASE_URL}/paymob/webhook`,
      redirection_url: `${process.env.BASE_URL}/paymob/return`,
    };

    console.log('Paymob Payload:', payload);

    const intentionResponse = await createPaymobIntention(payload);
    const paymentUrl = generatePaymobCheckoutUrl(
      process.env.PAYMOB_PUBLIC_KEY,
      intentionResponse.client_secret,
    );

    return {
      paymentUrl,
      merchantRef,
    };
  }
}
