import { Field, InputType, Int } from '@nestjs/graphql';
import { PaginationInput } from 'support/pagination.input';
import { In } from 'typeorm';

@InputType()
export class PaginateRegistrationAttendanceInput extends PaginationInput {
  @Field(() => [String], { nullable: true })
  parentIds?: string[];

  @Field(() => [Int], { nullable: true })
  childrenIds?: number[];

  @Field(() => [Int], { nullable: true })
  campVariantIds?: number[];
}
