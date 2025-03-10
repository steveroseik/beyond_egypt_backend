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
import e from 'express';
import { on } from 'events';
import { PaginateCampRegistrationsInput } from './dto/paginate-camp-registrations.input';
import { buildPaginator } from 'typeorm-cursor-pagination';

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
      if (cv.capacity < campVariants.get(cv.id)) {
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
      campVariantRegistrations,
      campVariantVacancies,
      campVariants,
    );
  }

  calculateCampVariantRegistrationPrice(
    campVariantRegistrations: CreateCampVariantRegistrationInput[],
    campVariants: CampVariant[],
    campVariantsCount: Map<number, number>,
  ): string {
    let totalPrice = new Decimal(0);

    for (const [key, count] of campVariantsCount.entries()) {
      const cvr = campVariants.find((e) => e.id === key);
      totalPrice = totalPrice.plus(new Decimal(cvr.price).times(count));
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

    if (!input.paymentMethod) throw new Error('Payment method is required');

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

  remove(id: number) {
    return `This action removes a #${id} campRegistration`;
  }
}
