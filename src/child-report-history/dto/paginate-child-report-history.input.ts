import { Field, InputType, Int } from '@nestjs/graphql';
import { PaginationInput } from 'support/pagination.input';

@InputType()
export class PaginateChildReportHistoryInput extends PaginationInput {
  @Field(() => Int)
  childReportId: number;
}
