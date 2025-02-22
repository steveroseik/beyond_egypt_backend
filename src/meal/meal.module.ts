import { Module } from '@nestjs/common';
import { MealService } from './meal.service';
import { MealResolver } from './meal.resolver';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Meal } from './entities/meal.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Meal])],
  providers: [MealResolver, MealService],
  exports: [MealService],
})
export class MealModule {}
