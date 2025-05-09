import { CreateCampVariantRegistrationInput } from 'src/camp-variant-registration/dto/create-camp-variant-registration.input';
import { PaymentMethod } from 'support/enums';
import { Decimal, GraphqlDecimal } from 'support/scalars';
import { CreateCampRegistrationInput } from './create-camp-registration.input';
import { InputType, Field, Int, PartialType } from '@nestjs/graphql';

@InputType()
export class CompleteCampRegistrationInput {
  @Field(() => Int)
  id: number;

  @Field({ nullable: true })
  parentId?: string;

  @Field({ nullable: true })
  behaviorConsent?: boolean;

  @Field({ nullable: true })
  refundPolicyConsent?: boolean;

  @Field({ nullable: true })
  discountId: number;

  @Field(() => [CreateCampVariantRegistrationInput], { nullable: true })
  campVariantRegistrations?: CreateCampVariantRegistrationInput[];
}
