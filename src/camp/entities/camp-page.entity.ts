import { Field, ObjectType } from '@nestjs/graphql';
import { PaginationResponse } from 'support/page-response.entity';
import { Camp } from './camp.entity';

@ObjectType()
export class CampPage extends PaginationResponse {
  @Field(() => [Camp])
  data: Camp[];
}
