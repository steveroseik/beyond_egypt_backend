import { Field, ObjectType } from '@nestjs/graphql';
import { User } from 'src/user/entities/user.entity';

@ObjectType()
export class UserAuthResponse {
  @Field(() => User, { nullable: true })
  user?: User;

  @Field({ nullable: true })
  accessToken?: string;

  @Field({
    nullable: true,
    description: '0: No User, 1: Incomplete User, 2: Complete User',
  })
  userState?: number;

  @Field({})
  message: string;
}
