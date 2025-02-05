import { InputType, Int, Field } from '@nestjs/graphql';

@InputType()
export class CreateCampRegistrationInput {
  @Field(() => Int, { description: 'Example field (placeholder)' })
  exampleField: number;
}
