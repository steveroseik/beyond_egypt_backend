import { InputType, Field } from '@nestjs/graphql';
import { PaginationInput } from 'support/pagination.input';

@InputType()
export class PaginateEventsInput extends PaginationInput {
  @Field({ nullable: true })
  search?: string;

  @Field({ nullable: true })
  isPrivate: boolean;
}
