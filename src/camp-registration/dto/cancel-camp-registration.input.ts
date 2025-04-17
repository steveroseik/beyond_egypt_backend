import { Field, InputType, Int } from '@nestjs/graphql';

@InputType()
export class CancelCampRegistrationInput {
  @Field(() => Int)
  campRegistrationId: number;
}
