import { Module } from '@nestjs/common';
import { MealService } from './meal.service';
import { MealResolver } from './meal.resolver';

@Module({
  providers: [MealResolver, MealService],
})
export class MealModule {}
