import { Inject, Injectable } from '@nestjs/common';
import { CreateAllergyInput } from './dto/create-allergy.input';
import { UpdateAllergyInput } from './dto/update-allergy.input';
import { InjectRepository } from '@nestjs/typeorm';
import { Allergy } from './entities/allergy.entity';
import { DataSource, Repository } from 'typeorm';
import { PaginateAllergiesInput } from './dto/paginate-allergies.input';
import { buildPaginator } from 'typeorm-cursor-pagination';

@Injectable()
export class AllergyService {
  constructor(
    @InjectRepository(Allergy) private readonly repo: Repository<Allergy>,
    private dataSource: DataSource,
  ) {}

  async create(createAllergyInput: CreateAllergyInput) {
    try {
      const response = await this.repo.insert(createAllergyInput);

      if (response.raw.affectedRows !== 1) {
        throw new Error('Allergy was not created');
      }

      return {
        success: true,
        message: 'Allergy created successfully',
        data: {
          id: response.raw.insertId,
        },
      };
    } catch (e) {
      console.log(e);
      return {
        success: false,
        message: 'Error while creating allergy',
      };
    }
  }

  findOne(id: number) {
    return this.repo.findOne({ where: { id } });
  }

  async update(input: UpdateAllergyInput) {
    try {
      const validUpdateInput = Object.keys(input).some(
        (key) => key !== 'id' && input[key] !== undefined,
      );

      if (!validUpdateInput) {
        throw new Error('No valid fields to update');
      }

      const response = await this.repo.update(input.id, input);

      if (response.affected !== 1) {
        throw new Error('Allergy was not updated');
      }

      return {
        success: true,
        message: 'Allergy updated successfully',
      };
    } catch (e) {
      console.log(e);
      return {
        success: false,
        message: 'Error while updating allergy',
      };
    }
  }

  async remove(ids: number[]) {
    try {
      const response = await this.repo.softDelete(ids);

      if (response.affected == 0) {
        throw new Error('Allergies were not deleted');
      }

      return {
        success: true,
        message: `${response.affected} Allergies deleted successfully`,
      };
    } catch (e) {
      console.log(e);
      return {
        success: false,
        message: 'Error while deleting allergy',
      };
    }
  }

  paginate(input: PaginateAllergiesInput) {
    const queryBuilder = this.repo.createQueryBuilder('allergy');

    if (input.search) {
      queryBuilder.where(
        'allergy.nameEn LIKE :search OR allergy.nameAr LIKE :search',
        {
          search: `%${input.search}%`,
        },
      );
    }

    const paginator = buildPaginator({
      entity: Allergy,
      alias: 'allergy',
      paginationKeys: ['createdAt', 'id'],
      query: {
        ...input,
        order: input.isAsc ? 'ASC' : 'DESC',
      },
    });

    return paginator.paginate(queryBuilder);
  }

  findAllergiesByChildIds(childIds: readonly number[]) {
    return this.dataSource
      .getRepository(Allergy)
      .createQueryBuilder('allergy')
      .innerJoin('allergy.children', 'child')
      .where('child.id IN (:...childIds)', { childIds })
      .getMany();
  }
}
