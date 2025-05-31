import { Field, ObjectType } from '@nestjs/graphql';
import { PaginationResponse } from 'support/page-response.entity';
import { ChildReportHistory } from './child-report-history.entity';

@ObjectType()
export class ChildReportHistoryPage extends PaginationResponse {
  @Field(() => [ChildReportHistory])
  data: ChildReportHistory[];
}
