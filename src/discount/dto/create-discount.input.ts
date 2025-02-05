import { InputType, Int, Field } from '@nestjs/graphql';

@InputType()
export class CreateDiscountInput {
  @Field(() => Int, { description: 'Example field (placeholder)' })
  exampleField: number;
}
