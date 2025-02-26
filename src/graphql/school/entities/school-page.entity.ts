import { Field, ObjectType } from '@nestjs/graphql';
import { PaginationResponse } from 'support/page-response.entity';
import { School } from './school.entity';

@ObjectType()
export class SchoolPage extends PaginationResponse {
  @Field(() => [School])
  data: School[];
}
