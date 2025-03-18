import { InputType, Int, Field } from '@nestjs/graphql';
import { CreateCampVariantRegistrationInput } from 'src/camp-variant-registration/dto/create-camp-variant-registration.input';
import { CampRegistrationStatus, PaymentMethod } from 'support/enums';
import { Decimal, GraphqlDecimal } from 'support/scalars';

@InputType()
export class CreateCampRegistrationInput {
  @Field()
  parentId: string;

  @Field()
  campId: number;

  @Field(() => GraphqlDecimal, { nullable: true })
  oneDayPrice?: Decimal;

  @Field(() => GraphqlDecimal, { nullable: true })
  totalPrice?: Decimal;

  @Field(() => PaymentMethod, { nullable: true })
  paymentMethod?: PaymentMethod;

  @Field(() => [CreateCampVariantRegistrationInput], { nullable: true })
  campVariantRegistrations?: CreateCampVariantRegistrationInput[];
}
