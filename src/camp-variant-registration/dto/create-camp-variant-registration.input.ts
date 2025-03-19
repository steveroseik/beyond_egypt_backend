import { InputType, Int, Field } from '@nestjs/graphql';
import { Transform } from 'class-transformer';

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
  withMeal?: boolean;

  @Field(() => ShirtSize, { nullable: true })
  shirtSize?: ShirtSize;
}
