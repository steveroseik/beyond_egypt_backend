import { Injectable } from '@nestjs/common';
import { CreateCampInput } from './dto/create-camp.input';
import { UpdateCampInput } from './dto/update-camp.input';
import { PaginateCampsInput } from './dto/paginate-camps.input';
import { InjectRepository } from '@nestjs/typeorm';
import { buildPaginator } from 'typeorm-cursor-pagination';
import { DataSource, In, QueryRunner, Repository } from 'typeorm';
import { Camp } from './entities/camp.entity';
import { Meal } from 'src/meal/entities/meal.entity';
import { File } from 'src/file/entities/file.entity';
import { AgeRange } from 'src/age-range/entities/age-range.entity';
import { CampVariant } from 'src/camp-variant/entities/camp-variant.entity';
import { CreateCampVariantInput } from 'src/camp-variant/dto/create-camp-variant.input';
import { CampRegistration } from 'src/camp-registration/entities/camp-registration.entity';
import { CampRegistrationStatus } from 'support/enums';
import { moneyFixation } from 'support/constants';
import * as moment from 'moment-timezone';
import { CampRegistrationService } from 'src/camp-registration/camp-registration.service';

@Injectable()
export class CampService {
  constructor(
    @InjectRepository(Camp) private repo: Repository<Camp>,
    private dataSource: DataSource,
    private campRegistrationService: CampRegistrationService,
  ) {}

  async create(input: CreateCampInput) {
    if ((input.variants?.length ?? 0) <= 0) {
      return {
        success: false,
        message: 'Camp must have at least one variant',
      };
    }

    if (!input.defaultPrice) {
      for (const variant of input.variants) {
        if (!variant.price) {
          return {
            success: false,
            message:
              'Camp must have a default price or each week must have a price',
          };
        }
      }
    }

    if (!input.defaultCapacity) {
      for (const variant of input.variants) {
        if (!variant.capacity) {
          return {
            success: false,
            message:
              'Camp must have a default capacity or each week must have a capacity',
          };
        }
      }
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // const mealIds = await this.handleMeals(input, queryRunner);
      const fileIds = await this.handleFiles(input, queryRunner);
      const ageRangeIds = await this.handleAgeRanges(input, queryRunner);

      const camp = await queryRunner.manager.insert(Camp, {
        ...input,
        defaultPrice: input.defaultPrice?.toFixed(2),
        mealPrice: input.mealPrice?.toFixed(2),
      });
      if (camp.raw.affectedRows !== 1) {
        throw new Error('Failed to insert camp');
      }

      await this.handleCampVariants(input, queryRunner, camp.raw.insertId);

      // if (mealIds?.length) {
      //   await queryRunner.manager
      //     .createQueryBuilder(Camp, 'camp')
      //     .relation(Camp, 'meals')
      //     .of(camp.raw.insertId)
      //     .add(mealIds);
      // }

      if (fileIds?.length) {
        await queryRunner.manager
          .createQueryBuilder(Camp, 'camp')
          .relation(Camp, 'files')
          .of(camp.raw.insertId)
          .add(fileIds);
      }

      if (ageRangeIds?.length) {
        await queryRunner.manager
          .createQueryBuilder(Camp, 'camp')
          .relation(Camp, 'ageRanges')
          .of(camp.raw.insertId)
          .add(ageRangeIds);
      }

      await queryRunner.commitTransaction();
      return {
        success: true,
        message: 'Camp created successfully',
      };
    } catch (e) {
      console.log(e);
      await queryRunner.rollbackTransaction();
      return {
        success: false,
        message: e.message,
      };
    } finally {
      await queryRunner.release();
    }
  }

  async handleCampVariants(
    input: CreateCampInput | UpdateCampInput,
    queryRunner: QueryRunner,
    campId: number,
  ) {
    if (!input.variants?.length) {
      return;
    }

    const campVariants = input.variants.map((variant) => {
      return {
        ...variant,
        capacity: variant.capacity ?? input.defaultCapacity,
        price:
          variant.price?.toFixed(2) ??
          input.defaultPrice?.toFixed(moneyFixation),
        campId,
        remainingCapacity: variant.capacity,
      };
    });

    const newCampVariants = await queryRunner.manager.insert(
      CampVariant,
      campVariants.map((variant) => ({
        ...variant,
        remainingCapacity: variant.remainingCapacity ?? variant.capacity,
      })),
    );
    if (newCampVariants.identifiers.length !== input.variants.length) {
      throw new Error('Failed to insert camp variants');
    }
  }

  // async handleMeals(input: CreateCampInput, queryRunner: QueryRunner) {
  //   if (!input.meals?.length && !input.mealIds?.length) {
  //     return;
  //   }

  //   if (input.mealIds?.length) {
  //     const existingMeals = await queryRunner.manager.find(Meal, {
  //       where: { id: In(input.mealIds) },
  //     });

  //     if (existingMeals.length !== input.mealIds.length) {
  //       const missingIds = input.mealIds.filter(
  //         (id) => !existingMeals.find((meal) => meal.id === id),
  //       );
  //       throw new Error(
  //         `Meals with the following ids do not exist: ${missingIds.join(', ')}`,
  //       );
  //     }
  //   }

  //   if (!input.meals?.length) return input.mealIds;

  //   const newMeals = await queryRunner.manager.insert(
  //     Meal,
  //     input.meals.map((e) => ({ ...e, price: e.price.toFixed(moneyFixation) })),
  //   );
  //   if (newMeals.identifiers.length !== input.meals.length) {
  //     throw new Error('Failed to insert meals');
  //   }

  //   return [
  //     ...newMeals.identifiers.map((meal: any) => meal.id),
  //     ...(input.mealIds ?? []),
  //   ];
  // }

  async handleFiles(
    input: CreateCampInput | UpdateCampInput,
    queryRunner: QueryRunner,
  ) {
    if (!input.fileIds?.length) {
      return;
    }

    const existingFiles = await queryRunner.manager.find(File, {
      where: { id: In(input.fileIds) },
    });
    if (existingFiles.length !== input.fileIds.length) {
      const missingIds = input.fileIds.filter(
        (id) => !existingFiles.find((file) => file.id === id),
      );
      throw new Error(
        `Files with the following ids do not exist: ${missingIds.join(', ')}`,
      );
    }

    return input.fileIds;
  }

  async handleAgeRanges(
    input: CreateCampInput | UpdateCampInput,
    queryRunner: QueryRunner,
  ) {
    if (!input.ageRangeIds?.length && !input.ageRanges?.length) {
      return;
    }

    if (input.ageRangeIds?.length) {
      const existingAgeRanges = await queryRunner.manager.find(AgeRange, {
        where: { id: In(input.ageRangeIds) },
      });
      if (existingAgeRanges.length !== input.ageRangeIds.length) {
        const missingIds = input.ageRangeIds.filter(
          (id) => !existingAgeRanges.find((ageRange) => ageRange.id === id),
        );
        throw new Error(
          `Age Ranges with the following ids do not exist: ${missingIds.join(', ')}`,
        );
      }
    }

    let newAgeRanges: any;
    if (input.ageRanges?.length) {
      newAgeRanges = await queryRunner.manager.insert(
        AgeRange,
        input.ageRanges,
      );
      if (newAgeRanges.identifiers.length !== input.ageRanges.length) {
        throw new Error('Failed to insert age ranges');
      }
    }

    return [
      ...(newAgeRanges?.identifiers.map((ageRange: any) => ageRange.id) ?? []),
      ...(input.ageRangeIds ?? []),
    ];
  }

  findAllByKeys(keys: readonly number[], withDeleted: boolean = false) {
    return this.repo.find({ where: { id: In(keys) }, withDeleted });
  }

  findOne(id: number) {
    return this.repo.findOne({ where: { id } });
  }

  async update(input: UpdateCampInput) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const fileIds = await this.handleFiles(input, queryRunner);
      const ageRangeIds = await this.handleAgeRanges(input, queryRunner);

      const camp = await this.repo.findOne({
        where: { id: input.id },
      });

      if (!camp) {
        throw new Error('Camp does not exist');
      }

      if (
        input.defaultPrice ||
        input.mealPrice ||
        input.defaultCapacity ||
        input.name ||
        input.description ||
        input.isPrivate !== undefined ||
        input.thumbnailId !== undefined ||
        input.hasShirts ||
        input.eventId !== undefined ||
        input.locationId !== undefined ||
        input.discountId !== undefined
      ) {
        const camp = await queryRunner.manager.update(
          Camp,
          {
            id: input.id,
          },
          {
            name: input.name,
            description: input.description,
            thumbnailId: input.thumbnailId,
            isPrivate: input.isPrivate,
            hasShirts: input.hasShirts,
            eventId: input.eventId,
            locationId: input.locationId,
            discountId: input.discountId,
            defaultPrice: input.defaultPrice?.toFixed(2),
            mealPrice: input.mealPrice?.toFixed(2),
          },
        );

        if (camp.affected !== 1) {
          throw new Error('Failed to update camp');
        }
      }

      if (fileIds?.length) {
        await queryRunner.manager
          .createQueryBuilder(Camp, 'camp')
          .relation(Camp, 'files')
          .of(input.id)
          .add(fileIds);
      }

      if (ageRangeIds?.length) {
        await queryRunner.manager
          .createQueryBuilder(Camp, 'camp')
          .relation(Camp, 'ageRanges')
          .of(input.id)
          .add(ageRangeIds);
      }

      if (input.ageRangeIdsToDelete?.length) {
        await queryRunner.manager
          .createQueryBuilder(Camp, 'camp')
          .relation(Camp, 'ageRanges')
          .of(input.id)
          .remove(input.ageRangeIdsToDelete);
      }

      if (input.variantIdsToDelete?.length) {
        const deleteVariants = await queryRunner.manager.delete(CampVariant, {
          id: In(input.variantIdsToDelete),
        });
        if (deleteVariants.affected !== input.variantIdsToDelete.length) {
          throw new Error('Failed to delete camp variants');
        }
      }

      if (input.variants?.length) {
        const defaultPrice = input.defaultPrice ?? camp.defaultPrice;
        const defaultCapacity = input.defaultCapacity ?? camp.defaultCapacity;

        if (!defaultCapacity) {
          for (const variant of input.variants) {
            if (!variant.capacity) {
              throw new Error(
                'Camp must have a default capacity or each week must have a capacity',
              );
            }
          }
        }

        if (!defaultPrice) {
          for (const variant of input.variants) {
            if (!variant.price) {
              throw new Error(
                'Camp must have a default price or each week must have a price',
              );
            }
          }
        }

        await this.handleCampVariants(
          {
            ...input,
            defaultPrice,
            defaultCapacity,
          },
          queryRunner,
          input.id,
        );
      }

      if (input.variantsToUpdate?.length) {
        let variantsFailedToUpdate: number[] = [];
        for (const variant of input.variantsToUpdate) {
          if (
            variant.price ||
            variant.capacity ||
            variant.startDate ||
            variant.endDate
          ) {
            const update = await queryRunner.manager.update(
              CampVariant,
              { id: variant.id, campId: input.id },
              {
                name: variant.name,

                price: variant.price?.toFixed(2),
                capacity: variant.capacity,
                remainingCapacity: variant.remainingCapacity,
                startDate: variant.startDate,
                endDate: variant.endDate,
              },
            );

            if (update.affected !== 1) {
              variantsFailedToUpdate.push(variant.id);
            }
          }
        }
        if (variantsFailedToUpdate.length) {
          await queryRunner.commitTransaction();
          return {
            success: false,
            message: `Failed to update weeks with ids: ${variantsFailedToUpdate.join(
              ', ',
            )}`,
          };
        }
      }

      await queryRunner.commitTransaction();

      return {
        success: true,
        message: 'Camp updated successfully',
      };
    } catch (e) {
      await queryRunner.rollbackTransaction();
      console.log(e);
      return {
        success: false,
        message: e.message,
      };
    } finally {
      await queryRunner.release();
    }
  }

  async remove(id: number) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const camp = await this.repo.findOne({
        where: { id },
        relations: [
          'campVariants',
          'campRegistrations',
          'campRegistrations.campVariantRegistrations',
        ],
      });

      if (!camp) throw Error('Camp does not exist');

      const now = moment.tz('Africa/Cairo');

      if (camp.campRegistrations?.length) {
        // Check if there are any registrations for the camp
        for (const variant of camp.campVariants) {
          const registrations = camp.campRegistrations.filter((registration) =>
            registration.campVariantRegistrations?.some(
              (variant) =>
                variant.campVariantId === variant.id &&
                registration.status === CampRegistrationStatus.accepted,
            ),
          );

          if (registrations.length) {
            if (now.diff(variant.endDate) <= 0) {
              throw Error(
                `Cannot delete camp, there are registrations for the camp variant ${variant.name} that are still active.`,
              );
            }
          }
        }

        const registrationsToCancel = camp.campRegistrations.filter((e) =>
          [
            CampRegistrationStatus.idle,
            CampRegistrationStatus.pending,
          ].includes(e.status),
        );

        await this.campRegistrationService.cancelRegistrations({
          queryRunner,
          registrations: registrationsToCancel,
        });
      }

      const deleteCamp = await queryRunner.manager.softDelete(Camp, { id });

      if (deleteCamp.affected !== 1) {
        throw Error('Failed to delete camp');
      }

      if (camp.campVariants?.length) {
        const deleteCampVariants = await queryRunner.manager.softDelete(
          CampVariant,
          { campId: id },
        );

        if (deleteCampVariants.affected !== camp.campVariants.length) {
          throw Error('Failed to delete all camp Variants');
        }
      }

      await queryRunner.commitTransaction();
      return {
        success: true,
        message: 'Deleted Camp',
      };
    } catch (e) {
      await queryRunner.rollbackTransaction();
      console.log(e);
      return {
        success: false,
        message: e.message,
      };
    } finally {
      await queryRunner.release();
    }
  }

  async paginate(input: PaginateCampsInput) {
    const queryBuilder = this.repo
      .createQueryBuilder('camp')
      .leftJoinAndSelect('camp.ageRanges', 'ageRanges')
      .leftJoinAndSelect('camp.files', 'files');

    if (input.eventIds?.length) {
      queryBuilder.andWhere('camp.eventId IN (:...eventIds)', {
        eventIds: input.eventIds,
      });
    }

    if (input.locationIds?.length) {
      queryBuilder.andWhere('camp.locationId IN (:...locationIds)', {
        locationIds: input.locationIds,
      });
    }

    if (input.search) {
      queryBuilder.andWhere(
        'camp.name LIKE :search OR camp.description LIKE :search',
        {
          search: `%${input.search}%`,
        },
      );
    }

    if (input.isPrivate === true || input.isPrivate === false) {
      queryBuilder.andWhere('camp.isPrivate = :isPrivate', {
        isPrivate: input.isPrivate,
      });
    }

    const paginator = buildPaginator({
      entity: Camp,
      alias: 'camp',
      paginationKeys: ['createdAt', 'id'],
      query: {
        ...input,
        order: input.isAsc ? 'ASC' : 'DESC',
      },
    });

    return paginator.paginate(queryBuilder);
  }

  async findLatestCampRegistration(parentId: string, campId: number) {
    return this.dataSource.manager.findOne(CampRegistration, {
      where: { parentId, campId, status: CampRegistrationStatus.idle },
      order: { createdAt: 'DESC' },
    });
  }

  findCampsByEventId(keys: readonly number[]) {
    return this.repo.find({ where: { eventId: In(keys) } });
  }
}
