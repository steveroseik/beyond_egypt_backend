import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';

import { Strategy, ExtractJwt } from 'passport-jwt';
import * as dotenv from 'dotenv';
import { JwtPayload } from '../types/jwtPayload.type';
import { Request } from 'express';

dotenv.config();

/// This strategy is not needed anymore, as we are using the AccessTokenGuard
@Injectable()
export class AccessTokenStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.access_token_secret,
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: JwtPayload) {
    req.user = payload;
    return payload;
  }
}
