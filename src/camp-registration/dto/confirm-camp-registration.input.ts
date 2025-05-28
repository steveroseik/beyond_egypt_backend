import { Field, InputType } from '@nestjs/graphql';
import { PaymentMethod } from 'support/enums';
import { Decimal, GraphqlDecimal } from 'support/scalars';
import { Base64Image } from 'support/shared/base64Image.object';

@InputType()
export class ConfirmCampRegistrationInput {
  @Field()
  id: number;

  @Field(() => PaymentMethod, { nullable: true })
  paymentMethod?: PaymentMethod;

  @Field(() => Base64Image, { nullable: true })
  receipt?: Base64Image;

  @Field({ nullable: true })
  referenceNumber?: string;

  @Field(() => GraphqlDecimal)
  paidAmount: Decimal;
}
