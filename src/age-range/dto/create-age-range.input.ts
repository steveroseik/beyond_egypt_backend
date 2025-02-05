import { InputType, Int, Field } from '@nestjs/graphql';

@InputType()
export class CreateAgeRangeInput {
  @Field(() => Int, { description: 'Example field (placeholder)' })
  exampleField: number;
}
