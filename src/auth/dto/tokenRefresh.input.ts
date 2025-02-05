import { InputType, Int, Field } from '@nestjs/graphql';

@InputType()
export class TokenRefreshInput {
  @Field()
  token: string;
  @Field()
  refreshToken: string;
}
