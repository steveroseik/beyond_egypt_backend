import { Field, InputType } from '@nestjs/graphql';
import { ChildReportStatus } from 'support/enums';
import { PaginationInput } from 'support/pagination.input';

@InputType()
export class PaginateChildReportsInput extends PaginationInput {
  @Field({ nullable: true, description: 'Filter by child ID' })
  childId?: number;

  @Field({ nullable: true, description: 'Filter by camp variant ID' })
  campVariantId?: number;

  // @Field({ nullable: true, description: 'Filter by report type' })
  // type?: string;

  @Field({ nullable: true, description: 'Filter by report status' })
  status?: ChildReportStatus;
}
