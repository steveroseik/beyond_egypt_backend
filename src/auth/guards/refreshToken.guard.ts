import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';
import * as jwt from 'jsonwebtoken';
import * as dotenv from 'dotenv';

dotenv.config();

@Injectable()
export class RefreshTokenGuard extends AuthGuard('jwt-refresh') {
  constructor(private reflector: Reflector) {
    super();
  }

  getRequest(context: ExecutionContext) {
    const ctx = GqlExecutionContext.create(context);

    return ctx.getContext().req;
  }

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const requiresRefreshToken = this.reflector.get(
      'requiresRefreshToken',
      context.getHandler(),
    );
    if (!requiresRefreshToken) return true;

    const ctx = GqlExecutionContext.create(context);
    const request = ctx.getContext().req;

    if (request) {
      const authHeader = request.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];

      if (token) {
        try {
          const payload = jwt.verify(token, process.env.refresh_token_secret);
          console.log(payload);
        } catch (err) {
          if (err.name === 'TokenExpiredError') {
            throw new UnauthorizedException('expired refresh token.');
          }
          throw err;
        }
      }
    }

    return super.canActivate(context);
  }
}
