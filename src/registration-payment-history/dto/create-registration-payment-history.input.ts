import { InputType, Int, Field } from '@nestjs/graphql';

@InputType()
export class CreateRegistrationPaymentHistoryInput {
  @Field(() => Int, { description: 'Example field (placeholder)' })
  exampleField: number;
}
