import { Field, InputType, Int } from '@nestjs/graphql';
import { CampRegistrationStatus, ShirtSize } from 'support/enums';
import { PaginationInput } from 'support/pagination.input';

@InputType()
export class PaginateCampVariantRegistrationsInput extends PaginationInput {
  @Field(() => [Int], { nullable: true })
  campIds?: number[];

  @Field(() => [Int], { nullable: true })
  campVariantIds?: number[];

  @Field(() => [Int], { nullable: true })
  childIds?: number[];

  @Field(() => [Int], { nullable: true })
  parentIds?: number[];

  @Field(() => [CampRegistrationStatus], { nullable: true })
  statuses?: CampRegistrationStatus[];

  @Field({ nullable: true })
  withMeal: boolean;

  @Field({ nullable: true })
  withShirt: boolean;
}
