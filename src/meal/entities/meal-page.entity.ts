import { Field, ObjectType } from '@nestjs/graphql';
import { PaginationResponse } from 'support/page-response.entity';
import { Meal } from './meal.entity';

@ObjectType()
export class MealPage extends PaginationResponse {
  @Field(() => [Meal])
  data: Meal[];
}
