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

  paidAmount?: Decimal;

  toBePaidAmount?: Decimal;

  @Field({ nullable: true })
  discountId?: number;

  @Field({ nullable: true })
  behaviorConsent?: boolean;

  @Field({ nullable: true })
  refundPolicyConsent?: boolean;

  @Field(() => PaymentMethod, { nullable: true })
  paymentMethod?: PaymentMethod;

  @Field(() => [CreateCampVariantRegistrationInput], { nullable: true })
  campVariantRegistrations?: CreateCampVariantRegistrationInput[];
}
