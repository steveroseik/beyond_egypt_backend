import { Field, InputType } from '@nestjs/graphql';
import { PaymentMethod } from 'support/enums';
import { Base64Image } from 'support/shared/base64Image.object';

@InputType()
export class ProcessCampRegistrationInput {
  @Field()
  campRegistrationId: number;

  @Field(() => PaymentMethod, { nullable: true })
  paymentMethod?: PaymentMethod;

  @Field(() => Base64Image, { nullable: true })
  receipt?: Base64Image;

  @Field({ nullable: true })
  referenceNumber?: string;

  @Field({ nullable: true })
  refundPolicyConsent: boolean;

  @Field({ nullable: true })
  behaviorConsent: boolean;

  @Field({ nullable: true })
  discountId?: number;
}
