import { CreateChildReportInput } from './create-child-report.input';
import { InputType, Field, Int, PartialType } from '@nestjs/graphql';

@InputType()
export class UpdateChildReportInput extends PartialType(CreateChildReportInput) {
  @Field(() => Int)
  id: number;
}
