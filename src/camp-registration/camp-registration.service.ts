import { Injectable } from '@nestjs/common';
import { CreateCampRegistrationInput } from './dto/create-camp-registration.input';
import { UpdateCampRegistrationInput } from './dto/update-camp-registration.input';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, QueryRunner, Repository } from 'typeorm';
import { CampRegistration } from './entities/camp-registration.entity';
import { CampRegistrationStatus, UserType } from 'support/enums';
import { CampVariantRegistration } from 'src/camp-variant-registration/entities/camp-variant-registration.entity';
import { CreateCampVariantRegistrationInput } from 'src/camp-variant-registration/dto/create-camp-variant-registration.input';
import { User } from 'src/user/entities/user.entity';
import { CampVariant } from 'src/camp-variant/entities/camp-variant.entity';
import Decimal from 'decimal.js';

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
      };
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      if (type == UserType.parent) {
        return this.handleParentCampCreation(input, queryRunner, userId);
      } else {
        return this.handleAdminCampRegistration(input, queryRunner, userId);
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

    const price = await this.handleCampVariantRegistrations(
      input.campVariantRegistrations,
      campRegistration.identifiers[0].id,
      queryRunner,
    );

    // if (price){

    // }

    return {
      success: true,
      message: 'Camp registration created successfully',
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
      input,
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
  ): Promise<Decimal | null> {
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
      if (cv.capacity < campVariants.get(cv.id)) {
        throw new Error(`Not enough vacancies for ${cv.name}`);
      }
    }

    const inserts = await queryRunner.manager.insert(
      CampVariantRegistration,
      campVariantRegistrations.map((e) => ({
        ...e,
        campRegistrationId,
      })),
    );

    if (inserts.raw.affectedRows !== campVariantRegistrations.length) {
      throw new Error('Failed to insert camp variant registrations');
    }

    return this.calculateCampVariantRegistrationPrice(
      campVariantRegistrations,
      campVariants,
    );
  }

  calculateCampVariantRegistrationPrice(
    campVariantRegistrations: CreateCampVariantRegistrationInput[],
    campVariants: Map<number, number>,
  ): Decimal {
    let totalPrice = new Decimal(0);

    for (const [key, count] of campVariants.entries()) {
      const cvr = campVariantRegistrations.find((e) => e.campVariantId === key);
      totalPrice = totalPrice.plus(new Decimal(cvr.price).times(count));
    }

    return totalPrice;
  }

  findAll() {
    return `This action returns all campRegistration`;
  }

  findOne(id: number) {
    return `This action returns a #${id} campRegistration`;
  }

  update(id: number, updateCampRegistrationInput: UpdateCampRegistrationInput) {
    return `This action updates a #${id} campRegistration`;
  }

  remove(id: number) {
    return `This action removes a #${id} campRegistration`;
  }
}
