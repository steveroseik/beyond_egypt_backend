import { InputType, Int, Field } from '@nestjs/graphql';
import { Exclude } from 'class-transformer';
import { Decimal, GraphqlDecimal } from 'support/scalars';

@InputType()
export class CreateMealInput {
  @Field()
  name: string;

  @Exclude()
  @Field(() => GraphqlDecimal)
  price: Decimal;
}
