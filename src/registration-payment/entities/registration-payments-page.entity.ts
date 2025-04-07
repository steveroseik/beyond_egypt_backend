import { Field, ObjectType } from '@nestjs/graphql';
import { PaginationResponse } from 'support/page-response.entity';
import { RegistrationPayment } from './registration-payment.entity';

@ObjectType()
export class RegistrationPaymentsPage extends PaginationResponse {
  @Field(() => [RegistrationPayment])
  data: RegistrationPayment[];
}
