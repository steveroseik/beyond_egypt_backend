import { InputType, Int, Field } from '@nestjs/graphql';
import { Exclude } from 'class-transformer';
import { Decimal, GraphqlDecimal } from 'support/scalars';

@InputType()
export class CreateCampVariantInput {
  campId: number;

  @Field({ nullable: true })
  name?: string;

  @Exclude()
  @Field(() => GraphqlDecimal, { nullable: true })
  price?: Decimal;

  @Field({ nullable: true })
  capacity?: number;

  @Field()
  startDate: Date;

  @Field()
  endDate: Date;
}
