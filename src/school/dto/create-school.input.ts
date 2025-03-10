import { InputType, Int, Field } from '@nestjs/graphql';

@InputType()
export class CreateSchoolInput {
  @Field(() => Int, { description: 'Example field (placeholder)' })
  exampleField: number;
}
