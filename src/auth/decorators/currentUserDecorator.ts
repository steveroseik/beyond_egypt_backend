import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import {
  JwtPayload,
  RefreshWithTokenPayload,
  refreshWithFirebasePayload,
} from '../types/jwtPayload.type';

export const CurrentUser = createParamDecorator(
  (data: keyof JwtPayload | undefined, context: ExecutionContext) => {
    const ctx = GqlExecutionContext.create(context);
    const req = ctx.getContext().req;
    if (data) return req.user[data];

    return req.user;
  },
);
