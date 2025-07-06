import { InputType, Field } from '@nestjs/graphql';
import { PaginationInput } from 'support/pagination.input';

@InputType()
export class PaginateChildrenInput extends PaginationInput {
  @Field({ nullable: true })
  parentId?: string;

  @Field({
    nullable: true,
  })
  campId: number;
}
