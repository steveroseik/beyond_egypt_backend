import { Injectable } from '@nestjs/common';
import { CreateCampInput } from './dto/create-camp.input';
import { UpdateCampInput } from './dto/update-camp.input';
import { PaginateCampsInput } from './dto/paginate-camps.input';
import { InjectRepository } from '@nestjs/typeorm';
import { buildPaginator } from 'typeorm-cursor-pagination';
import { DataSource, In, QueryRunner, Repository } from 'typeorm';
import { Camp } from './entities/camp.entity';
import { Meal } from 'src/meal/entities/meal.entity';

@Injectable()
export class CampService {
  constructor(
    @InjectRepository(Camp) private repo: Repository<Camp>,
    private dataSource: DataSource,
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
              'Camp must have a default price or each variant must have a price',
          };
        }
      }
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const mealIds = await this.handleMeals(input, queryRunner);
      const fileIds = await this.handleFiles(input, queryRunner);
      const ageRangeIds = await this.handleAgeRanges(input, queryRunner);

      const camp = await queryRunner.manager.insert(Camp, input);
      if (camp.raw.affectedRows !== 1) {
        throw new Error('Failed to insert camp');
      }

      await this.handleCampVariants(input, queryRunner, camp.raw.insertId);

      await queryRunner.manager
        .createQueryBuilder(Camp, 'camp')
        .relation(Meal, 'meal')
        .of(camp.raw.insertId)
        .add(mealIds);

      await queryRunner.manager
        .createQueryBuilder(Camp, 'camp')
        .relation(Camp, 'file')
        .of(camp.raw.insertId)
        .add(fileIds);

      await queryRunner.manager
        .createQueryBuilder(Camp, 'camp')
        .relation(Camp, 'ageRange')
        .of(camp.raw.insertId)
        .add(ageRangeIds);

      await queryRunner.commitTransaction();
      return {
        success: true,
        message: 'Camp created successfully',
      };
    } catch (e) {
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
    input: CreateCampInput,
    queryRunner: QueryRunner,
    campId: number,
  ) {
    if (!input.variants?.length) {
      return;
    }

    const campVariants = input.variants.map((variant) => {
      return {
        ...variant,
        price: variant.price ?? input.defaultPrice,
        campId,
      };
    });

    const newCampVariants = await queryRunner.manager.insert(
      Camp,
      campVariants,
    );
    if (newCampVariants.identifiers.length !== input.variants.length) {
      throw new Error('Failed to insert camp variants');
    }
    return;
  }

  async handleMeals(input: CreateCampInput, queryRunner: QueryRunner) {
    if (!input.meals?.length && !input.mealIds?.length) {
      return;
    }

    const existingMeals = await queryRunner.manager.find(Meal, {
      where: { id: In(input.mealIds) },
    });

    if (existingMeals.length !== input.mealIds.length) {
      const missingIds = input.mealIds.filter(
        (id) => !existingMeals.find((meal) => meal.id === id),
      );
      throw new Error(
        `Meals with the following ids do not exist: ${missingIds.join(', ')}`,
      );
    }

    const newMeals = await queryRunner.manager.insert(Meal, input.meals);
    if (newMeals.identifiers.length !== input.meals.length) {
      throw new Error('Failed to insert meals');
    }

    return [
      ...newMeals.identifiers.map((meal: any) => meal.id),
      ...input.mealIds,
    ];
  }

  async handleFiles(input: CreateCampInput, queryRunner: QueryRunner) {
    if (!input.fileIds?.length) {
      return;
    }

    const existingFiles = await queryRunner.manager.find(Meal, {
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

  async handleAgeRanges(input: CreateCampInput, queryRunner: QueryRunner) {
    if (!input.ageRangeIds?.length && !input.ageRanges?.length) {
      return;
    }

    const existingAgeRanges = await queryRunner.manager.find(Meal, {
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

    const newAgeRanges = await queryRunner.manager.insert(
      Meal,
      input.ageRanges,
    );
    if (newAgeRanges.identifiers.length !== input.ageRanges.length) {
      throw new Error('Failed to insert age ranges');
    }

    return [
      ...newAgeRanges.identifiers.map((ageRange: any) => ageRange.id),
      ...input.ageRangeIds,
    ];
  }

  findAll() {
    return `This action returns all camp`;
  }

  findOne(id: number) {
    return `This action returns a #${id} camp`;
  }

  update(id: number, updateCampInput: UpdateCampInput) {
    return `This action updates a #${id} camp`;
  }

  remove(id: number) {
    return `This action removes a #${id} camp`;
  }

  async paginate(input: PaginateCampsInput) {
    const queryBuilder = this.repo
      .createQueryBuilder('camp')
      .leftJoinAndSelect('camp.ageRanges', 'ageRanges')
      .leftJoinAndSelect('camp.meals', 'meals')
      .leftJoinAndSelect('camp.files', 'files');

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
}
