import { InputType, Int, Field } from '@nestjs/graphql';
import { ChildReportStatus } from 'support/enums';

@InputType()
export class CreateChildReportHistoryInput {
  @Field(() => Int, { description: 'ID of the child report' })
  childReportId: number;

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

  @Field(() => [Int], { description: 'List of file IDs', nullable: true })
  fileIds?: number[];

  reporterId: String;
}
