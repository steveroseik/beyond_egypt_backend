import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthResolver } from './auth.resolver';
import { JwtService } from '@nestjs/jwt';
import { UserModule } from 'src/user/user.module';
import { AccessTokenStrategy } from './strategies/accessToken.strategy';
import { RefreshTokenStrategy } from './strategies/refreshToken.strategy';

@Module({
  imports: [UserModule],
  providers: [AuthResolver, AuthService, JwtService, AccessTokenStrategy],
  exports: [AuthService],
})
export class AuthModule {}
