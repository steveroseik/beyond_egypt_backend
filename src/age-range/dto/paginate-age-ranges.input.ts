import { Field, InputType } from '@nestjs/graphql';
import { PaginationInput } from 'support/pagination.input';

@InputType()
export class PaginateAgeRangesInput extends PaginationInput {
  @Field(() => String, { nullable: true })
  search?: string;
}
