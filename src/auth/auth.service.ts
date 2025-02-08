import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { TokenRequestInput } from './dto/tokenRequest.input';
// import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Auth } from 'firebase-admin/auth';
import { DataSource, Repository } from 'typeorm';
import { UserService } from 'src/user/user.service';
import { User } from 'src/user/entities/user.entity';
import { JwtService } from '@nestjs/jwt';
import { gameInitSHA256 as hashToSHA256 } from './sha-encryption.method';
import { TokenRefreshInput } from './dto/tokenRefresh.input';
import { ForbiddenError } from '@nestjs/apollo';
import { app } from 'firebase-admin';
import admin from 'src/main';

import {
  UserCredential,
  getAuth,
  signInWithEmailAndPassword,
} from 'firebase/auth';

import { FirebaseError } from 'firebase/app';
import { UserAuthResponse } from './entities/user-auth-response.entity';
import { TempSignInInput } from './dto/temp-signin.input';
// import admin from "../main";

@Injectable()
export class AuthService {
  // private jwtService:JwtService,

  private firebaseAuth: Auth;

  constructor(
    private configService: ConfigService,
    @Inject(forwardRef(() => UserService)) private userService: UserService,
    private jwtService: JwtService,
  ) {
    this.firebaseAuth = admin.auth();
  }

  async tempLogin(input: TempSignInInput) {
    let userCredential: UserCredential;

    try {
      const auth = getAuth();
      userCredential = await signInWithEmailAndPassword(
        auth,
        input.email,
        input.password,
      );

      return {
        success: true,
        userCredential,
      };
    } catch (e) {
      if (e instanceof FirebaseError) {
        console.log(e);
        const errorMessage = this.handleAuthError(e);
        console.log(errorMessage);
        return {
          success: false,
          code: e.code,
          message: errorMessage,
        }; // Return the error message for further handling
      }

      return { success: false, message: e };
    }
  }

  async verifyFirebaseToken(token: string) {
    return await this.firebaseAuth.verifyIdToken(token);
  }

  async signIn(tokenPayload: TokenRequestInput): Promise<UserAuthResponse> {
    let email: string = undefined;
    try {
      const decoded = await this.verifyFirebaseToken(
        tokenPayload.firebaseToken,
      );
      if (decoded.email == null || decoded.email.length <= 0)
        throw Error('no_email_found');

      email = decoded.email;

      const user = await this.userService.findExactOne(
        decoded.email,
        decoded.uid,
      );

      if (!user) throw Error('user_not_registered');

      const accessToken = this.jwtService.sign(
        {
          id: user.id,
          type: user.type,
        },
        {
          expiresIn: '30m',
          secret: this.configService.get('access_token_secret'),
        },
      );

      return {
        user: user,
        accessToken,
        userState: 2,
        message: 'User signed in successfully',
      };
    } catch (e) {
      // TODO: fix no errors shown except last
      console.log(e);

      if (email) {
        const response = await this.isEmailValid(email);
        return {
          userState: response,
          message: 'Failed to sign in',
        };
      }

      return {
        userState: 0,
        message: 'User not found or invalid token',
      };
    }
  }

  async isEmailValid(email: string): Promise<number> {
    const data = await this.userService.findOneByEmail(email);

    const response = await this.tempLogin({
      email,
      password: 'fakePass123',
    });

    if (response.code == 'auth/user-not-found') {
      if (data) {
        await this.userService.remove(data.id);
      }
      return 0;
    } else {
      if (data) {
        return 2;
      } else {
        return 1;
      }
    }
  }

  findAll() {
    return `This action returns all auth`;
  }

  findOne(id: number) {
    return `This action returns a #${id} auth`;
  }

  remove(id: number) {
    return `This action removes a #${id} auth`;
  }

  handleAuthError(error: FirebaseError) {
    switch (error.code) {
      case 'auth/invalid-email':
        return 'The email address is not valid.';
      case 'auth/user-disabled':
        return 'The user corresponding to the given email has been disabled.';
      case 'auth/user-not-found':
        return 'No user found corresponding to the email.';
      case 'auth/wrong-password':
        return 'The password is invalid or the user does not have a password.';
      case 'auth/too-many-requests':
        return 'Too many attempts to log in. Please try again later.';
      case 'auth/email-already-in-use':
        return 'The email address is already in use by another account.';
      case 'auth/operation-not-allowed':
        return 'Operation not allowed. Please contact support.';
      case 'auth/weak-password':
        return 'The password is too weak.';
      case 'auth/invalid-action-code':
        return 'The action code is invalid. This can happen if the code is expired or already used.';
      case 'auth/expired-action-code':
        return 'The action code has expired. Please request a new one.';
      case 'auth/invalid-credential':
        return 'The credential is invalid. Please try again.';
      case 'auth/credential-already-in-use':
        return 'This credential is already associated with a different user account.';
      case 'auth/account-exists-with-different-credential':
        return 'An account already exists with the same email address but different sign-in credentials. Please use that credential to sign in.';
      case 'auth/timeout':
        return 'The operation timed out. Please try again.';
      case 'auth/popup-closed-by-user':
        return 'The popup was closed before authentication could be completed.';
      default:
        return 'An unknown error occurred. Please try again.';
    }
  }
}
