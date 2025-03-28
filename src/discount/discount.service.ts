import { Injectable } from '@nestjs/common';
import { CreateDiscountInput } from './dto/create-discount.input';
import { UpdateDiscountInput } from './dto/update-discount.input';
import { InjectRepository } from '@nestjs/typeorm';
import { Discount } from './entities/discount.entity';
import { DataSource, Repository } from 'typeorm';
import { PaginateDiscountsInput } from './dto/paginate-discounts.input';
import { buildPaginator } from 'typeorm-cursor-pagination';

@Injectable()
export class DiscountService {
  constructor(
    @InjectRepository(Discount) private readonly repo: Repository<Discount>,
    private dataSource: DataSource,
  ) {}

  async create(input: CreateDiscountInput) {
    try {
      if (!input.amount && !input.percentage) {
        throw new Error('Either amount or percentage must be provided');
      }

      if (!input.maximumDiscount && input.percentage) {
        throw new Error(
          'Maximum discount must be provided for percentage discounts',
        );
      }

      const response = await this.repo.insert(input);

      if (response.raw.affectedRows !== 1) {
        throw new Error('Discount was not created');
      }

      return {
        success: true,
        message: 'Discount created successfully',
        data: {
          id: response.raw.insertId,
        },
      };
    } catch (e) {
      console.log(e);
      return {
        success: false,
        message: 'Error while creating discount',
      };
    }
  }
  findOne(id: number) {
    return this.repo.findOne({ where: { id } });
  }

  async update(input: UpdateDiscountInput) {
    try {
      const validUpdateInput = Object.keys(input).some(
        (key) => key !== 'id' && input[key] !== undefined,
      );

      if (!validUpdateInput) {
        throw new Error('No valid fields to update');
      }

      const response = await this.repo.update(input.id, input);

      if (response.affected !== 1) {
        throw new Error('Discount was not updated');
      }

      return {
        success: true,
        message: 'Discount updated successfully',
      };
    } catch (e) {
      console.log(e);
      return {
        success: false,
        message: e,
      };
    }
  }

  async remove(ids: number[]) {
    try {
      const response = await this.repo.softDelete(ids);

      if (response.affected == 0) {
        throw new Error('Discounts were not deleted');
      }
      return {
        success: true,
        message: `${response.affected} Discount(s) deleted successfully`,
      };
    } catch (e) {
      console.log(e);
      return {
        success: false,
        message: 'Error while deleting discount',
      };
    }
  }

  paginate(input: PaginateDiscountsInput) {
    const queryBuilder = this.repo.createQueryBuilder('discount');

    if (input.search) {
      queryBuilder.where(
        'discount.code LIKE :search OR discount.name LIKE :search',
        {
          search: `%${input.search}%`,
        },
      );
    }

    if (input.active != null && input.active != undefined) {
      queryBuilder.andWhere('discount.endDate > CURRENT_TIMESTAMP(3)');
    }

    const paginator = buildPaginator({
      entity: Discount,
      paginationKeys: ['createdAt', 'id'],
      alias: 'discount',
      query: {
        ...input,
        order: input.isAsc ? 'ASC' : 'DESC',
      },
    });

    return paginator.paginate(queryBuilder);
  }
}
