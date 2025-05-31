import { InputType, Int, Field } from '@nestjs/graphql';
import { CreateChildReportHistoryWithoutIdInput } from 'src/child-report-history/dto/create-child-report-history-without-id.input';
import { ChildReportStatus, ChildReportType } from 'support/enums';

@InputType()
export class CreateChildReportInput {
  @Field(() => Int, { description: 'ID of the child' })
  childId: number;

  @Field(() => Int, { description: 'ID of the camp variant' })
  campVariantId: number;

  @Field(() => ChildReportType, {
    nullable: true,
    description: 'Type of the report',
    defaultValue: ChildReportType.incident,
  })
  type: ChildReportType;

  @Field(() => ChildReportStatus, {
    nullable: true,
    description: 'Status of the report',
    defaultValue: ChildReportStatus.new,
  })
  status: ChildReportStatus;

  @Field(() => CreateChildReportHistoryWithoutIdInput)
  details: CreateChildReportHistoryWithoutIdInput;
}
