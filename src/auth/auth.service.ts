import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { TokenRequestInput } from './dto/tokenRequest.input';
// import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Auth, DecodedIdToken } from 'firebase-admin/auth';
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
import { UserType } from 'support/enums';
import { shortIdLength } from 'support/random-uuid.generator';
// import admin from "../main";

@Injectable()
export class AuthService {
  // private jwtService:JwtService,

  private firebaseAuth: Auth;

  constructor(
    private configService: ConfigService,
    @Inject(forwardRef(() => UserService)) private userService: UserService,
    private jwtService: JwtService,
    private dataSource: DataSource,
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

      return { success: false, message: e.message || 'Unknown error' };
    }
  }

  async verifyFirebaseToken(token: string): Promise<DecodedIdToken | null> {
    try {
      return await this.firebaseAuth.verifyIdToken(token);
    } catch (e) {
      console.log(e);
      return null;
    }
  }

  async signIn(tokenPayload: TokenRequestInput): Promise<UserAuthResponse> {
    let email: string = undefined;
    try {
      const decoded = await this.verifyFirebaseToken(
        tokenPayload.firebaseToken,
      );
      if (decoded.email == null || decoded.email.length <= 0)
        throw Error('Invalid token, email not found');

      email = decoded.email;

      const user = await this.userService.findOneByEmail(decoded.email);

      if (!user) throw Error('User not found');

      if (tokenPayload.isAdmin) {
        if (user.type === UserType.parent) {
          throw Error('Unauthorized, only admins can sign in');
        }
      } else {
        if (user.type === UserType.admin) {
          throw Error('Unauthorized, only parents can sign in');
        }
      }

      if (user.id.length === shortIdLength) {
        const updateUser = await this.dataSource.manager.update(
          User,
          { id: user.id },
          {
            id: decoded.uid,
          },
        );

        if (updateUser.affected === 0) {
          throw Error('Failed to complete user sign in, please try again');
        }

        user.id = decoded.uid;
      } else {
        if (user.id !== decoded.uid) {
          throw Error('User mismatch, please try again');
        }
      }

      const accessToken = this.generateAccessToken(user.id, user.type);

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
          message: e.message ?? 'Failed to sign in',
        };
      }

      return {
        userState: 0,
        message: 'User not found or invalid token',
      };
    }
  }

  generateAccessToken(userId: string, type: UserType) {
    return this.jwtService.sign(
      {
        id: userId,
        type: type,
      },
      {
        expiresIn: '30m',
        secret: this.configService.get('access_token_secret'),
      },
    );
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

  async removeAuthUser(id: string) {
    try {
      await admin.auth().deleteUser(id);
      return { success: true, message: 'User deleted successfully' };
    } catch (e) {
      console.log(e);
      return { success: false, message: e.message || 'Failed to delete user' };
    }
  }

  async updateFirebaseEmail(uid: string, newEmail: string) {
    try {
      await this.firebaseAuth.updateUser(uid, {
        email: newEmail,
        emailVerified: false, // Reset email verification since it's a new email
      });
      return { success: true, message: 'Email updated successfully in Firebase' };
    } catch (e) {
      console.log('Firebase email update error:', e);
      if (e.code === 'auth/email-already-exists') {
        return { success: false, message: 'Email is already in use by another account' };
      }
      return { success: false, message: e.message || 'Failed to update email in Firebase' };
    }
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
