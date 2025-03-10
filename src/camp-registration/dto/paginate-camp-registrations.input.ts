import { Field, InputType, Int } from '@nestjs/graphql';
import { PaginationInput } from 'support/pagination.input';

@InputType()
export class PaginateCampRegistrationsInput extends PaginationInput {
  @Field(() => [Int], { nullable: true })
  campIds?: number[];

  @Field(() => [Int], { nullable: true })
  childIds?: number[];

  @Field(() => [String], { nullable: true })
  parentIds?: string[];
}
