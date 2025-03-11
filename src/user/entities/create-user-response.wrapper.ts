import { Field, ObjectType } from '@nestjs/graphql';
import { Auth } from 'firebase-admin/auth';
import { UserAuthResponse } from 'src/auth/entities/user-auth-response.entity';
import { ResponseWrapper } from 'support/response-wrapper.entity';

@ObjectType()
export class CreateUserResponse extends ResponseWrapper<UserAuthResponse> {
  @Field(() => UserAuthResponse, { nullable: true })
  data?: UserAuthResponse;

  @Field()
  success: boolean;

  @Field()
  message: string;
}
