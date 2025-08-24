import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { AuthService } from './auth.service';
import config from '../../../config';
import { ILoginUserResponse, IRefreshTokenResponse } from './auth.interface';
import ApiError from '../../../errors/ApiError';
import { IOrganization } from '../organization/organization.interface';

const loginUser = catchAsync(async (req: Request, res: Response) => {
  const loginData = req.body;

  const result = await AuthService.loginUser(loginData);
  const { refreshToken, accessToken, user } = result;

  // Set refresh token in secure cookie
  const cookieOptions = {
    secure: config.env === 'production',
    httpOnly: true,
    sameSite: 'strict' as const,
  };

  res.cookie('refreshToken', refreshToken, cookieOptions);

  sendResponse<Omit<ILoginUserResponse, 'refreshToken'>>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'User logged in successfully',
    data: {
      accessToken,
      user,
    },
  });
});

const refreshToken = catchAsync(async (req: Request, res: Response) => {
  const { refreshToken } = req.cookies;

  if (!refreshToken) {
    return res.status(httpStatus.BAD_REQUEST).json({
      success: false,
      message: 'Refresh token is missing',
    });
  }

  const result = await AuthService.refreshToken(refreshToken);

  sendResponse<IRefreshTokenResponse>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Access token refreshed successfully',
    data: result,
  });
});

const changePassword = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const payload = req.body;

  await AuthService.changePassword(Number(userId), payload);

  sendResponse<null>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Password changed successfully',
    data: null,
  });
});

const checkDomain = catchAsync(async (req: Request, res: Response) => {
  const { domain } = req.body;

  if (!domain || typeof domain !== 'string') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Domain is required');
  }

  const result = await AuthService.checkDomainExists(domain);

  sendResponse<IOrganization | null>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result ? 'Domain found' : 'Domain not found',
    data: result,
  });
});

export const AuthController = {
  loginUser,
  refreshToken,
  changePassword,
  checkDomain,
};
