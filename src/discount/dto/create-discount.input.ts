import { InputType, Int, Field } from '@nestjs/graphql';
import { GraphqlDecimal, Decimal } from 'support/scalars';

@InputType()
export class CreateDiscountInput {
  @Field()
  name: string;

  @Field({ nullable: true })
  code?: string;

  @Field(() => GraphqlDecimal, { nullable: true })
  percentage?: Decimal;

  @Field(() => GraphqlDecimal, { nullable: true })
  maximumDiscount?: string;

  @Field(() => GraphqlDecimal, { nullable: true })
  amount?: string;

  @Field()
  startDate: Date;

  @Field()
  endDate: Date;
}
