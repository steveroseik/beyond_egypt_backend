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
export class WebTokenGuard extends AuthGuard('jwt-refresh') {
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
    const requiresWebToken = this.reflector.get(
      'requiresWebToken',
      context.getHandler(),
    );
    if (!requiresWebToken) return true;

    const ctx = GqlExecutionContext.create(context);
    const request = ctx.getContext().req;

    if (request) {
      const authHeader = request.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];

      if (token) {
        try {
          const payload = jwt.verify(token, process.env.web_token_secret);
          request.user = payload;
          console.log(payload);
        } catch (err) {
          if (err.name === 'TokenExpiredError') {
            throw new UnauthorizedException('expired web token.');
          }
          throw err;
        }
      }
    }

    return super.canActivate(context);
  }
}
