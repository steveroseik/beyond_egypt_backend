import { InputType, Int, Field } from '@nestjs/graphql';
import Decimal from 'decimal.js';
import { ShirtSize } from 'support/enums';
import { GraphqlDecimal } from 'support/scalars';

@InputType()
export class CreateCampVariantRegistrationInput {
  @Field()
  childId: number;

  campRegistrationId: number;

  @Field()
  campVariantId: number;

  price: Decimal;

  @Field({ nullable: true })
  mealId?: number;

  @Field(() => ShirtSize, { nullable: true })
  shirtSize?: ShirtSize;
}
