import { InputType, Int, Field } from '@nestjs/graphql';
import { UserType } from 'support/enums';

@InputType()
export class TokenRequestInput {
  @Field()
  firebaseToken: string;

  @Field({ nullable: true, defaultValue: false })
  isAdmin?: boolean;
}
