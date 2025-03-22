import { Field, ObjectType } from '@nestjs/graphql';
import { PaginationResponse } from 'support/page-response.entity';
import { Location } from './location.entity';

@ObjectType()
export class LocationsPage extends PaginationResponse {
  @Field(() => [Location])
  data: Location[];
}
