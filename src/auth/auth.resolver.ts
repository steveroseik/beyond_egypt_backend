import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { AuthService } from './auth.service';
import { TokenRequestInput } from './dto/tokenRequest.input';
import { Auth } from 'firebase-admin/auth';
import { Public } from './decorators/publicDecorator';
import { UserAuthResponse } from './entities/user-auth-response.entity';

@Resolver()
export class AuthResolver {
  private firebaseAuth: Auth;

  constructor(private readonly authService: AuthService) {}

  // @Mutation(() => GraphQLJSONObject)
  // tempLogin(@Args('input') input: SignInByEmailInput) {
  //   return this.authService.tempLogin(input);
  // }

  @Public()
  @Mutation(() => UserAuthResponse)
  async signIn(
    @Args('input') input: TokenRequestInput,
  ): Promise<UserAuthResponse | null> {
    return this.authService.signIn(input);
  }

  // @Public()
  // @UseGuards(RefreshTokenGuard)
  // @Mutation(() => UserTokenResponse)
  // refreshToken(
  //   @Args('firebaseToken') firebaseToken:string,
  //   @CurrentUser('refreshToken') refreshToken:string){
  //   return this.authService.getNewToken({
  //     token: firebaseToken,
  //     refreshToken
  //   })
  // }

  // @Public()
  // @Query(() => GraphQLJSONObject)
  // userState(@Args('email') email: string) {
  //   return this.authService.isEmailValid(email);
  // }
}
