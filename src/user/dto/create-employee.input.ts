import { Field, InputType } from '@nestjs/graphql';
import { UserType } from 'support/enums';

@InputType()
export class CreateEmployeeInput {
  @Field()
  name: string;
  @Field()
  email: string;
  @Field({ nullable: true })
  phone?: string;
  @Field(() => UserType)
  type: UserType;
}
