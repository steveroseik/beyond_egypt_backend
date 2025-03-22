import { Field, InputType } from '@nestjs/graphql';
import { UserType } from 'support/enums';

@InputType()
export class CreateEmployeeInput {
  @Field()
  name: string;
  @Field()
  email: string;
  @Field()
  phone?: string;
  @Field(() => UserType)
  type: UserType;
}
