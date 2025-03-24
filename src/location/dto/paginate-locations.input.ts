import { Field, InputType } from '@nestjs/graphql';
import { PaginationInput } from 'support/pagination.input';

@InputType()
export class PaginateLocationsInput extends PaginationInput {
  @Field({ nullable: true })
  search?: string;
}
