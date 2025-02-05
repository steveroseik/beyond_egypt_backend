import { CreateChildReportHistoryInput } from './create-child-report-history.input';
import { InputType, Field, Int, PartialType } from '@nestjs/graphql';

@InputType()
export class UpdateChildReportHistoryInput extends PartialType(CreateChildReportHistoryInput) {
  @Field(() => Int)
  id: number;
}
