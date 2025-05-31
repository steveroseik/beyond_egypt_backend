import { Field, InputType, Int } from '@nestjs/graphql';
import { CreateChildReportHistoryInput } from './create-child-report-history.input';
import { ChildReportStatus } from 'support/enums';

@InputType()
export class CreateChildReportHistoryWithoutIdInput {
  @Field(() => Int, { nullable: true, description: 'ID of the child report' })
  childReportId?: number;

  @Field(() => Date, { description: 'Time of the report' })
  reportTime: Date;

  @Field(() => String, { nullable: true, description: 'Name of the game' })
  gameName?: string;

  @Field(() => String, { description: 'Details of the report' })
  details: string;

  @Field(() => String, {
    description: 'Actions taken in response to the report',
  })
  actionsTaken: string;

  @Field(() => ChildReportStatus, { description: 'Status of the report' })
  status: ChildReportStatus;

  reporterId: number;
}
