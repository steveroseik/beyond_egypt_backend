import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { MealService } from './meal.service';
import { Meal } from './entities/meal.entity';
import { CreateMealInput } from './dto/create-meal.input';
import { UpdateMealInput } from './dto/update-meal.input';

@Resolver(() => Meal)
export class MealResolver {
  constructor(private readonly mealService: MealService) {}

  @Mutation(() => Meal)
  createMeal(@Args('createMealInput') createMealInput: CreateMealInput) {
    return this.mealService.create(createMealInput);
  }

  @Query(() => [Meal], { name: 'meal' })
  findAll() {
    return this.mealService.findAll();
  }

  @Query(() => Meal, { name: 'meal' })
  findOne(@Args('id', { type: () => Int }) id: number) {
    return this.mealService.findOne(id);
  }

  @Mutation(() => Meal)
  updateMeal(@Args('updateMealInput') updateMealInput: UpdateMealInput) {
    return this.mealService.update(updateMealInput.id, updateMealInput);
  }

  @Mutation(() => Meal)
  removeMeal(@Args('id', { type: () => Int }) id: number) {
    return this.mealService.remove(id);
  }
}
