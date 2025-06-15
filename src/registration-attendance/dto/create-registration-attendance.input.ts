import { InputType, Int, Field } from '@nestjs/graphql';

@InputType()
export class CreateRegistrationAttendanceInput {
  @Field(() => Int)
  campRegistrationId: number;

  @Field(() => Int)
  campVariantId: number;

  @Field(() => Int)
  childId: number;

  @Field(() => String)
  token: string;
}
