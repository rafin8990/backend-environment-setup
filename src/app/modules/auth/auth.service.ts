import {
  IChangePassword,
  ILoginUser,
  ILoginUserResponse,
  IRefreshTokenResponse,
} from './auth.interface';
import pool from '../../../utils/dbClient';
import bcrypt from 'bcryptjs';
import httpStatus from 'http-status';
import ApiError from '../../../errors/ApiError';
import config from '../../../config';
import { jwtHelpers } from '../../../helpers/jwtHelpers';
import { Secret } from 'jsonwebtoken';
import { IOrganization } from '../organization/organization.interface';

// ...existing code...
const loginUser = async (payload: ILoginUser): Promise<ILoginUserResponse> => {
  const { email, password } = payload;

  const query = `
    SELECT 
      id, name, email, username, password, phone_number, address,
      organization_id, image, status, role, created_at, updated_at
    FROM users
    WHERE email = $1 OR username = $1;
  `;
  const result = await pool.query(query, [email]);

  const user = result.rows[0];

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User does not exist');
  }

  const isPasswordMatched = await bcrypt.compare(password, user.password);
  if (!isPasswordMatched) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Password did not match');
  }

  if (user.status === 'suspended' || user.status === 'inactive') {
    throw new ApiError(httpStatus.FORBIDDEN, `Your account is ${user.status}.`);
  }

  const accessToken = jwtHelpers.createToken(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organization_id,
    },
    config.jwt_secret as string,
    config.jwt_expires_in as string
  );

  const refreshToken = jwtHelpers.createToken(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organization_id,
    },
    config.jwt_refresh_secret as string,
    config.jwt_refresh_expires_in as string
  );

  // Remove password before returning user
  delete user.password;

  return {
    accessToken,
    refreshToken,
    user,
  };
};
// ...existing code...
const refreshToken = async (token: string): Promise<IRefreshTokenResponse> => {
  let verifiedToken = null;

  try {
    verifiedToken = jwtHelpers.verifyToken(
      token,
      config.jwt_refresh_secret as Secret
    );
  } catch (error) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Invalid refresh token');
  }

  const { email } = verifiedToken;

  const result = await pool.query(
    'SELECT id, email, role FROM users WHERE email = $1',
    [email]
  );

  if (result.rows.length === 0) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User does not exist');
  }

  const user = result.rows[0];

  const newAccessToken = jwtHelpers.createToken(
    {
      email: user.email,
      id: user.id,
      role: user.role,
    },
    config.jwt_secret as string,
    config.jwt_expires_in as string
  );

  return {
    accessToken: newAccessToken,
  };
};

const changePassword = async (
  userId: number,
  payload: IChangePassword
): Promise<void> => {
  const { oldPassword, newPassword } = payload;

  const userQuery = 'SELECT * FROM users WHERE id = $1';
  const userResult = await pool.query(userQuery, [userId]);

  if (userResult.rows.length === 0) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  const user = userResult.rows[0];

  const isMatch = await bcrypt.compare(oldPassword, user.password);
  if (!isMatch) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Old password is incorrect');
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  const updateQuery =
    'UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2';
  await pool.query(updateQuery, [hashedPassword, userId]);
};

const checkDomainExists = async (
  domain: string
): Promise<IOrganization | null> => {
  const query = `
    SELECT * FROM organizations
    WHERE domain = $1
    LIMIT 1;
  `;

  const result = await pool.query(query, [domain]);

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
};

export const AuthService = {
  loginUser,
  refreshToken,
  changePassword,
  checkDomainExists,
};
