import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";

import { Strategy, ExtractJwt } from "passport-jwt";

import * as  dotenv from "dotenv";
import { JwtPayload, JwtRefreshPayload, RefreshWithTokenPayload, refreshWithFirebasePayload} from "../types/jwtPayload.type";
import { Request } from "express";

dotenv.config();


@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(Strategy, 'jwt-refresh'){

    constructor() {
         super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            secretOrKey: process.env.refresh_token_secret,
            passReqToCallback: true,
        })
    }

    validate(req:Request, payload:JwtRefreshPayload): RefreshWithTokenPayload{
        const refreshToken = req?.get('authorization')?.replace('Bearer', '').trim();
        return {
            ...payload,
            refreshToken
        };
    }
}