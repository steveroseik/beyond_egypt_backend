import { InputType, Int, Field } from '@nestjs/graphql';

@InputType()
export class CreateRegistrationReserveInput {
  @Field(() => Int, { description: 'Example field (placeholder)' })
  exampleField: number;
}
