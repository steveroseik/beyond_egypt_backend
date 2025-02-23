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

  create(createMealInput: CreateMealInput) {
    return 'This action adds a new meal';
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
}
