import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as dotenv from 'dotenv';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';
import * as jwt from 'jsonwebtoken';

dotenv.config();

@Injectable()
export class AccessTokenGuard extends AuthGuard('jwt') {
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
    const isPublic = this.reflector.get('isPublic', context.getHandler());
    if (isPublic) return true;

    const ctx = GqlExecutionContext.create(context);
    const request = ctx.getContext().req;

    if (request) {
      const authHeader = request.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];

      if (token) {
        try {
          const payload = jwt.verify(token, process.env.access_token_secret);
          request.user = payload;
        } catch (err) {
          if (err.name === 'TokenExpiredError') {
            throw new UnauthorizedException('expired jwt token.');
          }
          throw err;
        }
      }
    }

    return super.canActivate(context);
  }
}
