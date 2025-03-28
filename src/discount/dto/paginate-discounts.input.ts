import { Field, InputType } from '@nestjs/graphql';
import { PaginationInput } from 'support/pagination.input';

@InputType()
export class PaginateDiscountsInput extends PaginationInput {
  @Field({ nullable: true })
  search?: string;

  @Field({ nullable: true })
  active?: boolean;
}
