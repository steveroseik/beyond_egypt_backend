import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class JwtExpirationMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers['authorization'];

    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      jwt.verify(token, process.env.access_token_secret, (err, decoded) => {
        if (err && err.name === 'TokenExpiredError') {
          throw new UnauthorizedException('Token has expired');
        }
        next();
      });
    } else {
      next();
    }
  }
}
