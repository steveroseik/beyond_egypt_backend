import { InputType, Int, Field } from '@nestjs/graphql';
import { CreateAgeRangeInput } from 'src/age-range/dto/create-age-range.input';
import { CreateCampVariantInput } from 'src/camp-variant/dto/create-camp-variant.input';
import { CreateMealInput } from 'src/meal/dto/create-meal.input';
import { Decimal, GraphqlDecimal } from 'support/scalars';

@InputType()
export class CreateCampInput {
  @Field()
  name: string;

  @Field({ nullable: true })
  description?: string;

  @Field()
  thumbnailId: number;

  @Field(() => GraphqlDecimal, { nullable: true })
  defaultPrice?: Decimal;

  @Field(() => GraphqlDecimal, { nullable: true })
  mealPrice?: Decimal;

  @Field()
  hasShirts: boolean;

  @Field({ nullable: true })
  eventId?: number;

  @Field()
  isPrivate: boolean;

  @Field({ nullable: true })
  defaultCapacity?: number;

  @Field()
  locationId: number;

  @Field({ nullable: true })
  discountId?: number;

  @Field(() => [CreateCampVariantInput])
  variants: CreateCampVariantInput[];

  @Field(() => [CreateAgeRangeInput], { nullable: true })
  ageRanges?: CreateAgeRangeInput[];

  @Field(() => [Int], { nullable: true })
  ageRangeIds?: number[];

  @Field(() => [Int], { nullable: true })
  fileIds?: number[];

  @Field(() => [Int], { nullable: true })
  mealIds?: number[];

  @Field(() => [CreateMealInput], { nullable: true })
  meals?: CreateMealInput[];
}
