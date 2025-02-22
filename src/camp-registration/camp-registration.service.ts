import { Injectable } from '@nestjs/common';
import { CreateCampRegistrationInput } from './dto/create-camp-registration.input';
import { UpdateCampRegistrationInput } from './dto/update-camp-registration.input';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, QueryRunner, Repository } from 'typeorm';
import { CampRegistration } from './entities/camp-registration.entity';
import { CampRegistrationStatus, UserType } from 'support/enums';
import { CampVariantRegistration } from 'src/camp-variant-registration/entities/camp-variant-registration.entity';
import { CreateCampVariantRegistrationInput } from 'src/camp-variant-registration/dto/create-camp-variant-registration.input';
import { User } from 'src/user/entities/user.entity';

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
    if (type == UserType.parent) {
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
          message: 'You have already an incomplete registration for this camp',
        };
      }
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const campRegistration = await queryRunner.manager.insert(
        CampRegistration,
        input,
      );

      if (campRegistration.raw.affectedRows !== 1) {
        throw new Error('Failed to insert campRegistration');
      }

      if (type != UserType.parent) {
        if (!input.status) {
          throw new Error('status is required');
        }

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
      }

      await queryRunner.commitTransaction();
      return campRegistration.raw;
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

  async handleCampVariantRegistrations(
    campVariantRegistrations: CreateCampVariantRegistrationInput[],
    campRegistrationId: number,
    queryRunner: QueryRunner,
  ) {
    if (!campVariantRegistrations?.length) {
      return;
    }

    for (const cvr of campVariantRegistrations) {
      const existing = campVariantRegistrations.filter(
        (e) =>
          e.childId === cvr.childId && e.campVariantId == cvr.campVariantId,
      );
      if (existing.length > 1) {
        throw new Error('Duplicate camp variant registration');
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
