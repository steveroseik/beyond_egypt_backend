import { Field, ObjectType } from '@nestjs/graphql';
import { PaginationResponse } from 'support/page-response.entity';
import { User } from './user.entity';

@ObjectType()
export class UsersPage extends PaginationResponse {
  @Field(() => [User])
  data: User[];
}
