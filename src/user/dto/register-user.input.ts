import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class RegisterUserInput {
  @Field()
  id: string;

  @Field()
  firebaseToken: string;
}
