import { InputType, Int, Field } from '@nestjs/graphql';

import { ShirtSize } from 'support/enums';
import { Decimal, GraphqlDecimal } from 'support/scalars';

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
