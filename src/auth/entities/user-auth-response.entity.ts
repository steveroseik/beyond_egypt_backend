import { Field } from '@nestjs/graphql';
import { User } from 'src/user/entities/user.entity';

export class UserAuthResponse {
  @Field(() => User)
  user: User;

  @Field()
  accessToken: string;
}
