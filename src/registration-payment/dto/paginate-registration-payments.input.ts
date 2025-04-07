import { Field, InputType } from '@nestjs/graphql';
import { PaymentMethod, PaymentStatus } from 'support/enums';
import { PaginationInput } from 'support/pagination.input';

@InputType()
export class PaginateRegistrationPaymentsInput extends PaginationInput {
  @Field({ nullable: true })
  userId?: string;

  @Field({ nullable: true })
  campRegistrationId?: number;

  @Field(() => [PaymentMethod], { nullable: true })
  paymentMethods?: PaymentMethod[];

  @Field(() => [PaymentStatus], { nullable: true })
  statuses?: PaymentStatus[];
}
