import { InputType, Int, Field } from '@nestjs/graphql';
import { Exclude } from 'class-transformer';
import { Decimal, GraphqlDecimal } from 'support/scalars';

@InputType()
export class CreateCampVariantInput {
  campId: number;

  @Field()
  name: string;

  @Field(() => GraphqlDecimal, { nullable: true })
  price?: Decimal;

  @Field({ nullable: true })
  capacity: number;

  @Field({ nullable: true })
  remainingCapacity?: number;

  @Field()
  startDate: Date;

  @Field()
  endDate: Date;
}
