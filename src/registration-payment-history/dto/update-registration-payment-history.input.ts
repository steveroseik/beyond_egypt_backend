import { CreateRegistrationPaymentHistoryInput } from './create-registration-payment-history.input';
import { InputType, Field, Int, PartialType } from '@nestjs/graphql';

@InputType()
export class UpdateRegistrationPaymentHistoryInput extends PartialType(CreateRegistrationPaymentHistoryInput) {
  @Field(() => Int)
  id: number;
}
