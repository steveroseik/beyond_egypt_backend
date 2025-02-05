import { InputType, Int, Field } from '@nestjs/graphql';

@InputType()
export class CreateRegistrationAttendanceInput {
  @Field(() => Int, { description: 'Example field (placeholder)' })
  exampleField: number;
}
