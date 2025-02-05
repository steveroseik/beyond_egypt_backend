import { InputType, Int, Field } from '@nestjs/graphql';

@InputType()
export class CreateChildReportHistoryInput {
  @Field(() => Int, { description: 'Example field (placeholder)' })
  exampleField: number;
}
