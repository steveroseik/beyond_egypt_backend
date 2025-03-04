import { InputType, Int, Field } from '@nestjs/graphql';
import Decimal from 'decimal.js';
import { GraphqlDecimal } from 'support/scalars';

@InputType()
export class CreateCampVariantInput {
  campId: number;

  @Field({ nullable: true })
  name?: string;

  @Field(() => GraphqlDecimal, { nullable: true })
  price?: Decimal;

  @Field({ nullable: true })
  capacity?: number;

  @Field()
  startDate: Date;

  @Field()
  endDate: Date;
}
