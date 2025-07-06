import { Injectable } from '@nestjs/common';
import { CreateAgeRangeInput } from './dto/create-age-range.input';
import { UpdateAgeRangeInput } from './dto/update-age-range.input';
import { InjectRepository } from '@nestjs/typeorm';
import { AgeRange } from './entities/age-range.entity';
import { DataSource, In, Repository } from 'typeorm';
import { Camp } from 'src/camp/entities/camp.entity';
import { PaginateAgeRangesInput } from './dto/paginate-age-ranges.input';
import { buildPaginator } from 'typeorm-cursor-pagination';

@Injectable()
export class AgeRangeService {
  constructor(
    @InjectRepository(AgeRange) private readonly repo: Repository<AgeRange>,
    private dataSource: DataSource,
  ) {}

  async create(createAgeRangeInput: CreateAgeRangeInput) {
    try {
      const created = await this.repo.insert(createAgeRangeInput);
      if (created.raw.affectedRows === 0) {
        throw new Error('Error creating age range');
      }

      return {
        success: true,
        message: 'Age range created successfully',
        data: {
          id: created.raw.insertId,
        },
      };
    } catch (e) {
      console.log(e);
      return {
        success: false,
        message: e.message,
      };
    }
  }

  findOne(id: number) {
    return this.repo.findOne({
      where: { id },
    });
  }

  async update(updateAgeRangeInput: UpdateAgeRangeInput) {
    try {
      const updated = await this.repo.update(
        updateAgeRangeInput.id,
        updateAgeRangeInput,
      );
      if (updated.affected === 0) {
        throw new Error('Error updating age range');
      }

      return {
        success: true,
        message: 'Age range updated successfully',
      };
    } catch (e) {
      console.log(e);
      return {
        success: false,
        message: e.message,
      };
    }
  }

  async remove(ids: number[]) {
    try {
      const deleted = await this.repo.delete({ id: In(ids) });
      if (deleted.affected === 0) {
        throw new Error('Error deleting age range');
      }

      return {
        success: true,
        message: `${deleted.affected} age range(s) deleted successfully`,
      };
    } catch (e) {
      console.log(e);
      return {
        success: false,
        message: e.message,
      };
    }
  }

  findAgeRangesByCampIds(keys: readonly number[]) {
    return this.repo
      .createQueryBuilder('ageRange')
      .leftJoinAndSelect('ageRange.camps', 'camp')
      .where('camp.id IN (:...keys)', { keys })
      .getMany();
  }

  paginate(input: PaginateAgeRangesInput) {
    const queryBuilder = this.repo.createQueryBuilder('ageRange');

    if (input.search) {
      queryBuilder.where('name LIKE :search', {
        search: `%${input.search}%`,
      });
    }

    const paginator = buildPaginator({
      entity: AgeRange,
      alias: 'ageRange',
      paginationKeys: ['createdAt', 'id'],
      query: {
        ...input,
        order: input.isAsc ? 'ASC' : 'DESC',
      },
    });

    return paginator.paginate(queryBuilder);
  }
}
