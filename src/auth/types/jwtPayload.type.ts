import { UserType } from 'support/enums';

export type JwtPayload = {
  id: string;
  type: UserType;
};

export type JwtRefreshPayload = {
  email: string;
  id: string;
};

export type RefreshWithTokenPayload = JwtRefreshPayload & {
  refreshToken: string;
};

export type refreshWithFirebasePayload = {
  firebaseToken: string;
};
