import { Field, ObjectType } from '@nestjs/graphql';
import { PaginationResponse } from 'support/page-response.entity';
import { Event } from './event.entity';

@ObjectType()
export class EventPage extends PaginationResponse {
  @Field(() => [Event])
  data: Event[];
}
