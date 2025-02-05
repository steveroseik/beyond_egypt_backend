import { InputType, Int, Field } from '@nestjs/graphql';

@InputType()
export class CreateCampInput {
  @Field(() => Int, { description: 'Example field (placeholder)' })
  exampleField: number;
}
