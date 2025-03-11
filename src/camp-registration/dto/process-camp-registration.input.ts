import { Field, InputType } from '@nestjs/graphql';
import { PaymentMethod } from 'support/enums';

@InputType()
export class ProcessCampRegistration {
  @Field()
  campRegistrationId: number;

  @Field(() => PaymentMethod, { nullable: true })
  paymentMethod?: PaymentMethod;
}
