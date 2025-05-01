import { Field, InputType } from '@nestjs/graphql';
import { Base64Image } from 'support/shared/base64Image.object';

@InputType()
export class CompleteRegistrationRefundInput {
  @Field()
  campRegistrationId: number;

  @Field()
  paymentId: number;

  @Field()
  receipt: Base64Image;
}
