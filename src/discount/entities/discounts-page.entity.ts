import { Field, ObjectType } from '@nestjs/graphql';
import { PaginationResponse } from 'support/page-response.entity';
import { Discount } from './discount.entity';

@ObjectType()
export class DiscountsPage extends PaginationResponse {
  @Field(() => [Discount])
  data: Discount[];
}
