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
import { difference, max, min } from 'lodash';
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
      if (now.diff(cv.startDate) >= 0) {
        if (campVariantRegistrations.find((e) => e.campVariantId == cv.id)) {
          throw new Error(`${cv.name} has already started, you can't register`);
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

    if (campRegistration.camp.hasShirts) {
      if (input.campVariantRegistrations?.some((e) => !e.shirtSize)) {
        throw new Error('Shirt size is required');
      }
    }

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
          behaviorConsent: input.behaviorConsent,
          refundPolicyConsent: input.refundPolicyConsent,
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
      }

      if (
        campRegistration.refundPolicyConsent === false &&
        input.refundPolicyConsent === false
      ) {
        throw new Error('Refund policy consent is required');
      }

      const paymentMethod =
        input.paymentMethod ?? campRegistration.paymentMethod;

      if (!paymentMethod) throw Error('Select a payment method first');

      if (userType == UserType.admin) {
        if (paymentMethod === PaymentMethod.fawry) {
          throw Error(
            'Admins cannot initiate fawry payments, only parents can',
          );
        }
      }

      //TODO: handle two scenarios
      // first: if payment is secondary and the difference is positive
      // second: if the payment is secondary and the difference is negative

      /// basic case
      /// if this is the first payment

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

    let amountTobePaid = campRegistration.amount.minus(
      campRegistration.discountAmount ?? 0,
    );

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
              discountAmount: discountAmount?.toFixed(moneyFixation),
              amount: totalAmount?.toFixed(moneyFixation),
            },
          );

          if (updated.affected !== 1) {
            throw new Error('Failed to update camp registration');
          }

          amountTobePaid = totalAmount?.minus(discountAmount ?? 0);

          await queryRunner.manager.update(
            RegistrationPayment,
            {
              campRegistrationId: campRegistration.id,
              status: PaymentStatus.pending,
            },
            { status: PaymentStatus.expired },
          );
        }
      }
    }

    const pendingPayments = campRegistration.payments?.filter(
      (e) => e.status == PaymentStatus.pending,
    );

    if (paymentMethod === PaymentMethod.fawry) {
      /// Find pending and return of any
      /// Otherwise expire fawry pendings
      if (pendingPayments?.length) {
        const validPayments = pendingPayments.filter(
          (e) =>
            moment().tz('Africa/Cairo').diff(e.expirationDate, 'minutes') < 0,
        );

        if (validPayments?.length) {
          const validWithAmount = validPayments.find(
            (e) => e.amount == amountTobePaid,
          );
          if (validWithAmount) {
            const ids = validPayments
              .filter((p) => p.id !== validWithAmount.id)
              .map((e) => e.id);

            if (ids?.length) {
              const expirePendingPayments = await queryRunner.manager.update(
                RegistrationPayment,
                {
                  id: In(ids),
                },
                {
                  status: PaymentStatus.expired,
                },
              );

              if (expirePendingPayments.affected !== ids.length) {
                throw new Error('Failed to expire old fawry payments');
              }
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

      const expiredFawryPayments = campRegistration.payments?.filter(
        (e) =>
          e.paymentMethod == PaymentMethod.fawry &&
          e.status == PaymentStatus.expired &&
          e.amount.eq(amountTobePaid),
      );

      if (expiredFawryPayments?.length) {
        const newExpiration = moment()
          .tz('Africa/Cairo')
          .add(10, 'minute')
          .toDate();
        const updatePayment = await queryRunner.manager.update(
          RegistrationPayment,
          { id: expiredFawryPayments[0].id },
          {
            status: PaymentStatus.pending,
            expirationDate: newExpiration,
            createdAt: () => 'CURRENT_TIMESTAMP(3)',
          },
        );

        if (updatePayment.affected !== 1) {
          throw new Error('Failed to update fawry payment');
        }

        if (pendingPayments?.length) {
          const expireOldPayments = await queryRunner.manager.update(
            RegistrationPayment,
            {
              id: In(pendingPayments.map((e) => e.id)),
            },
            {
              status: PaymentStatus.expired,
            },
          );

          if (expireOldPayments.affected !== pendingPayments.length) {
            throw new Error('Failed to expire old fawry payments');
          }
        }

        await queryRunner.commitTransaction();
        return {
          success: true,
          payment: expiredFawryPayments[0],
          expiration: newExpiration,
        };
      }
    } else {
      if (pendingPayments?.length) {
        const validPayment = pendingPayments?.find(
          (e) =>
            e.paymentMethod === paymentMethod && e.amount == amountTobePaid,
        );

        if (validPayment) {
          const ids = pendingPayments
            .filter((p) => p.id !== validPayment.id)
            .map((e) => e.id);

          if (ids?.length) {
            const expirePendingPayments = await queryRunner.manager.update(
              RegistrationPayment,
              {
                id: In(ids),
              },
              {
                status: PaymentStatus.expired,
              },
            );

            if (expirePendingPayments.affected !== ids.length) {
              throw new Error('Failed to expire old fawry payments');
            }
          }

          await queryRunner.commitTransaction();
          return {
            success: true,
            payment: validPayment,
          };
        } else {
          const expireValidPayments = await queryRunner.manager.update(
            RegistrationPayment,
            { id: In(pendingPayments.map((e) => e.id)) },
            {
              status: PaymentStatus.expired,
            },
          );

          if (expireValidPayments.affected !== pendingPayments.length) {
            throw new Error('Failed to expire old fawry payments');
          }
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

    await this.updateReservations({
      queryRunner,
      campVariantVacancies,
      campRegistration,
    });

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
              ? now.add(expirationMinutes, 'minute').toDate()
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
      ]),
    );

    console.log('campVariantIds', campVariantIds);
    console.log('INSERTS');
    console.table(variantsToInsert);
    console.log('UPDATES');
    console.table(variantsToUpdate);
    console.log('EXISTING');
    console.table(existingVariants);
    console.log('DELETES');
    console.table(variantsToDelete);
    console.log('oldDiscount', oldDiscount);
    console.log('newDiscount', newDiscount);

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
        queryRunner,
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
          queryRunner,
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
      queryRunner,
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

  async getSumOfPaidAmounts(
    campRegistrationId: number,
    queryRunner: QueryRunner,
  ): Promise<Decimal> {
    const response = await queryRunner.manager
      .createQueryBuilder(RegistrationPayment, 'registrationPayment')
      .select('SUM(amount) as paidAmount')
      .where({ status: PaymentStatus.paid, campRegistrationId })
      .getRawOne();

    return new Decimal(`${response?.paidAmount ?? 0}`);
  }

  async updateMoneyDifferenceAndOther(
    input: UpdateCampRegistrationInput,
    campRegistration: CampRegistration,
    newTotalPrice: Decimal,
    queryRunner: QueryRunner,
    discount?: Discount,
  ) {
    /// get total of paid amount

    const paidAmount = await this.getSumOfPaidAmounts(
      campRegistration.id,
      queryRunner,
    );
    const discountAmount = new Decimal(`${discount?.amount ?? 0}`);
    newTotalPrice = newTotalPrice?.minus(discountAmount);
    const difference = newTotalPrice.minus(paidAmount);

    const newStatus = difference.isNegative()
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
        discountAmount: discountAmount.toFixed(moneyFixation),
        amount: newTotalPrice.toFixed(moneyFixation),
        paidAmount: paidAmount.toFixed(moneyFixation),
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

    console.log('campVariantRegistrations in VALIDATION');
    console.table(campVariantRegistrations);

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

      const amountToBePaid = campRegistration.amount
        .minus(campRegistration.discountAmount ?? 0)
        .minus(campRegistration.paidAmount ?? 0);

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

      if (paymentMethod === PaymentMethod.fawry) {
        throw new Error('Fawry payment is not supported');
      }

      const payments = await queryRunner.manager.find(RegistrationPayment, {
        where: {
          campRegistrationId: campRegistration.id,
          status: PaymentStatus.pending,
        },
        lock: { mode: 'pessimistic_write' },
      });

      let payment: RegistrationPayment = payments[0];

      if (payments?.length > 1) {
        throw new Error('Invalid number of pending payments');
      }

      if (payments?.length === 1) {
        if (
          input.paymentMethod &&
          input.paymentMethod !== payment.paymentMethod
        ) {
          const expirePayments = await queryRunner.manager.update(
            RegistrationPayment,
            { id: payments[0].id },
            {
              status: PaymentStatus.expired,
            },
          );
          if (expirePayments.affected !== 1) {
            throw new Error('Failed to expire old payment');
          }
        } else {
          if (payments[0].paymentMethod === PaymentMethod.fawry) {
            throw new Error('Cannot confirm fawry payments');
          }
          if (!payment.amount.eq(amountToBePaid)) {
            throw new Error(
              'Invoice amount is not equal to the total amount to be paid',
            );
          }
        }
      } else {
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
      const paidAmount = await this.getSumOfPaidAmounts(
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
          paidAmount: paidAmount?.toFixed(moneyFixation),
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
          where: { campRegistrationId: payment.campRegistrationId },
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
}
