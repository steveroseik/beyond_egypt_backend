import { Field, ObjectType } from '@nestjs/graphql';
import { PaginationResponse } from 'support/page-response.entity';
import { AgeRange } from './age-range.entity';

@ObjectType()
export class AgeRangePage extends PaginationResponse {
  @Field(() => [AgeRange])
  data: AgeRange[];
}
