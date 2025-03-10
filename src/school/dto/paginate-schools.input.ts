import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { PaginationInput } from 'support/pagination.input';

@InputType()
export class PaginateSchoolsInput extends PaginationInput {
  @Field(() => String, { nullable: true })
  name?: string;
}
