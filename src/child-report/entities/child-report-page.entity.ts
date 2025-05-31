import { Field, ObjectType } from '@nestjs/graphql';
import { PaginationResponse } from 'support/page-response.entity';
import { ChildReport } from './child-report.entity';

@ObjectType()
export class ChildReportPage extends PaginationResponse {
  @Field(() => [ChildReport])
  data: ChildReport[];
}
