import { IUser } from '../users/users.interface';

export type ILoginUser = {
  email: string;
  password: string;
};

export type ILoginUserResponse = {
  email?: string;
  message?: string;
  accessToken?: string;
  refreshToken?: string;
  user: IUser;
};

export type IRefreshTokenResponse = {
  accessToken: string;
};

export type IChangePassword = {
  oldPassword: string;
  newPassword: string;
};
