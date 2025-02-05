import { InputType, Int, Field } from '@nestjs/graphql';

@InputType()
export class CreateRegistrationHistoryInput {
  @Field(() => Int, { description: 'Example field (placeholder)' })
  exampleField: number;
}
