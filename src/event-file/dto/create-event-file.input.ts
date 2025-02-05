import { InputType, Int, Field } from '@nestjs/graphql';

@InputType()
export class CreateEventFileInput {
  @Field(() => Int, { description: 'Example field (placeholder)' })
  exampleField: number;
}
