import { Field, InputType } from '@nestjs/graphql';
import { PaginationInput } from 'support/pagination.input';

@InputType()
export class PaginateAllergiesInput extends PaginationInput {
  @Field(() => String, { nullable: true })
  search?: string;
}
