import { Injectable } from '@nestjs/common';
import { CreateMealInput } from './dto/create-meal.input';
import { UpdateMealInput } from './dto/update-meal.input';
import { InjectRepository } from '@nestjs/typeorm';
import { Meal } from './entities/meal.entity';
import { Repository } from 'typeorm';
import { PaginateMealsInput } from './dto/paginate-meals.input';
import { buildPaginator } from 'typeorm-cursor-pagination';

@Injectable()
export class MealService {
  constructor(
    @InjectRepository(Meal) private mealRepository: Repository<Meal>,
  ) {}

  async create(createMealInput: CreateMealInput) {
    try {
      const meal = await this.mealRepository.insert(createMealInput);
      if (meal.raw.affectedRows === 1) {
        return {
          success: true,
          message: 'Meal created successfully',
          data: {
            id: meal.raw.insertId,
          },
        };
      }
      return {
        success: false,
        message: 'Failed to create meal',
      };
    } catch (e) {
      console.log(e);
      return {
        success: false,
        message: e.message,
      };
    }
  }

  findAll() {
    return `This action returns all meal`;
  }

  findOne(id: number) {
    return `This action returns a #${id} meal`;
  }

  update(id: number, updateMealInput: UpdateMealInput) {
    return `This action updates a #${id} meal`;
  }

  remove(id: number) {
    return `This action removes a #${id} meal`;
  }

  async paginate(input: PaginateMealsInput) {
    const queryBuilder = this.mealRepository.createQueryBuilder('meal');
    const paginator = buildPaginator({
      entity: Meal,
      alias: 'meal',
      paginationKeys: ['createdAt', 'id'],
      query: {
        ...input,
        order: input.isAsc ? 'ASC' : 'DESC',
      },
    });

    return paginator.paginate(queryBuilder);
  }

  findMealsByCampIds(campIds: readonly number[]) {
    return this.mealRepository
      .createQueryBuilder('meal')
      .innerJoin('meal.camps', 'camp')
      .where('camp.id IN (:...campIds)', { campIds })
      .getMany();
  }
}
