import { InputType, Field } from '@nestjs/graphql';
import { PaginationInput } from 'support/pagination.input';

@InputType()
export class PaginateChildInput extends PaginationInput {
  @Field()
  parentId: string;
}
