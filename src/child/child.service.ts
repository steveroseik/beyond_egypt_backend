import { Injectable } from '@nestjs/common';
import { CreateChildInput } from './dto/create-child.input';
import { UpdateChildInput } from './dto/update-child.input';
import { PaginateChildrenInput } from './dto/paginate-children.input';
import { InjectRepository } from '@nestjs/typeorm';
import { Child } from './entities/child.entity';
import { DataSource, In, QueryRunner, Repository } from 'typeorm';
import { buildPaginator } from 'typeorm-cursor-pagination';
import { Camp } from 'src/camp/entities/camp.entity';
import { UserType } from 'support/enums';

@Injectable()
export class ChildService {
  constructor(
    @InjectRepository(Child) private readonly repo: Repository<Child>,
    private dataSource: DataSource,
  ) {}
  create(createChildInput: CreateChildInput) {
    return 'This action adds a new child';
  }

  findAllByKeys(keys: readonly number[]) {
    return this.repo.find({ where: { id: In(keys) } });
  }

  findAllByParentId(keys: readonly string[]) {
    return this.repo.find({ where: { parentId: In(keys) } });
  }

  findOne(id: number) {
    return `This action returns a #${id} child`;
  }

  async update(input: UpdateChildInput, userId: string, userType: UserType) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const child = await this.repo.findOne({ where: { id: input.id } });

      if (!child) {
        throw new Error('Child not found');
      }

      await this.updateChild(child, input, queryRunner, userId, userType);

      await queryRunner.commitTransaction();
      return {
        success: true,
        message: 'Child updated successfully',
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

  async updateChild(
    child: Child,
    input: UpdateChildInput,
    queryRunner: QueryRunner,
    userId: string,
    userType: UserType,
  ) {
    if (userType == UserType.parent) {
      if (child.parentId !== userId) {
        throw new Error('Child does not belong to parent');
      }
    }

    const hasValidField = Object.keys(input).some(
      (key) =>
        key !== 'id' && input[key as keyof UpdateChildInput] !== undefined,
    );

    if (hasValidField) {
      const updated = await this.repo.update(input.id, {
        name: input.name,
        birthdate: input.birthdate,
        schoolId: input.schoolId,
        isMale: input.isMale,
        parentRelation: input.parentRelation,
        imageFileId: input.imageFileId,
        medicalInfo: input.medicalInfo,
        otherAllergies: input.otherAllergies,
        extraNotes: input.extraNotes,
      });

      if (updated.affected !== 1) {
        throw new Error('Failed to update child');
      }
    }

    if (input.allergiesToAdd.length > 0) {
      await queryRunner.manager
        .createQueryBuilder()
        .relation(Child, 'allergies')
        .of(child)
        .add(input.allergiesToAdd);
    }

    if (input.allergiesToDelete.length > 0) {
      await queryRunner.manager
        .createQueryBuilder()
        .relation(Child, 'allergies')
        .of(child)
        .remove(input.allergiesToDelete);
    }
  }

  remove(id: number) {
    return `This action removes a #${id} child`;
  }

  async paginate(input: PaginateChildrenInput) {
    const queryBuilder = this.repo.createQueryBuilder('child');

    const paginator = buildPaginator({
      entity: Child,
      alias: 'child',
      paginationKeys: ['createdAt', 'id'],
      query: {
        ...input,
        order: input.isAsc ? 'ASC' : 'DESC',
      },
    });

    if (input.parentId) {
      queryBuilder.andWhere('child.parentId = :parentId', {
        parentId: input.parentId,
      });
    }

    if (input.name) {
      queryBuilder.andWhere('child.name = :name', {
        name: `%${input.name}%`,
      });
    }

    if (input.campId) {
      const camp = await this.dataSource.manager.findOne(Camp, {
        where: { id: input.campId },
        relations: ['ageRanges'],
      });
      if (camp) {
        // based on current time and age ranges, get min and max birthdates for children
        const now = new Date();
        const minBirthDate = new Date(now);
        const maxBirthDate = new Date(now);
        for (const ageRange of camp.ageRanges) {
          if (
            ageRange.minAge <
            minBirthDate.getFullYear() - now.getFullYear()
          ) {
            minBirthDate.setFullYear(
              minBirthDate.getFullYear() - ageRange.minAge,
            );
          }
          if (ageRange.maxAge) {
            maxBirthDate.setFullYear(
              maxBirthDate.getFullYear() - ageRange.maxAge,
            );
          }
        }
      }
    }

    return paginator.paginate(queryBuilder);
  }
}
