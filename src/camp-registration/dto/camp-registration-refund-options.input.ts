import { Field, InputType } from '@nestjs/graphql';
import { GraphqlDecimal, Decimal } from 'support/scalars';

@InputType()
export class CampRegistrationRefundOptionsInput {
  @Field()
  CampRegistrationId: number;
}
