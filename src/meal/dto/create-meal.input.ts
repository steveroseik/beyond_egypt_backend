import { InputType, Int, Field } from '@nestjs/graphql';
import Decimal from 'decimal.js';
import { GraphqlDecimal } from 'support/scalars';

@InputType()
export class CreateMealInput {
  @Field()
  name: string;

  @Field(() => GraphqlDecimal)
  price: Decimal;
}
