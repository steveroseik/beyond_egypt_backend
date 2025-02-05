import { InputType, Int, Field } from '@nestjs/graphql';

@InputType()
export class CreateChildReportInput {
  @Field(() => Int, { description: 'Example field (placeholder)' })
  exampleField: number;
}
