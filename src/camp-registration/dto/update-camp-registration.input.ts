import Decimal from 'decimal.js';
import { CreateCampVariantRegistrationInput } from 'src/camp-variant-registration/dto/create-camp-variant-registration.input';
import { PaymentMethod } from 'support/enums';
import { GraphqlDecimal } from 'support/scalars';
import { CreateCampRegistrationInput } from './create-camp-registration.input';
import { InputType, Field, Int, PartialType } from '@nestjs/graphql';

@InputType()
export class UpdateCampRegistrationInput {
  @Field(() => Int)
  id: number;

  @Field({ nullable: true })
  parentId?: string;

  @Field(() => [Int], { nullable: true })
  variantsToDelete: number[];

  @Field(() => GraphqlDecimal, { nullable: true })
  oneDayPrice?: Decimal;

  @Field(() => GraphqlDecimal, { nullable: true })
  totalPrice?: Decimal;

  @Field(() => PaymentMethod, { nullable: true })
  paymentMethod?: PaymentMethod;

  @Field(() => [CreateCampVariantRegistrationInput], { nullable: true })
  campVariantRegistrations?: CreateCampVariantRegistrationInput[];
}
