import { Field, InputType } from '@nestjs/graphql';
import { UserType, UsersOrderField } from 'support/enums';
import { PaginationInput } from 'support/pagination.input';

@InputType()
export class PaginateUsersInput extends PaginationInput {
  @Field({ nullable: true })
  name?: string;

  @Field(() => [UserType], { nullable: true })
  types?: UserType[];

  @Field(() => [UserType], { nullable: true })
  notTypes?: UserType[];

  @Field(() => UsersOrderField, { nullable: true })
  orderBy?: UsersOrderField;
}
