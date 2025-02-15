import { Field, ObjectType } from '@nestjs/graphql';
import { PaginationResponse } from 'support/page-response.entity';
import { Child } from './child.entity';

@ObjectType()
export class ChildPage extends PaginationResponse {
  @Field(() => [Child])
  data: Child[];
}
