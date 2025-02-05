import { InputType, Int, Field } from '@nestjs/graphql';

@InputType()
export class CreateCampVariantRegistrationInput {
  @Field(() => Int, { description: 'Example field (placeholder)' })
  exampleField: number;
}
