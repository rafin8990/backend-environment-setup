import { NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status';
import { Secret } from 'jsonwebtoken';
import config from '../../config';
import ApiError from '../../errors/ApiError';
import { jwtHelpers } from '../../helpers/jwtHelpers';

declare global {
  namespace Express {
    interface Request {
      user:
        | {
            id: number;
            email: string;
            role: string;
          }
        | undefined;
    }
  }
}

const auth =
  (...requiredRoles: string[]) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new ApiError(httpStatus.UNAUTHORIZED, 'Unauthorized access');
      }

      const token = authHeader.split(' ')[1];
      const payload = jwtHelpers.verifyToken(
        token,
        config.jwt_secret as Secret
      );

      const { id, email, role } = payload as {
        id: number;
        email: string;
        role: string;
      };

      req.user = { id, email, role };

      if (requiredRoles.length && !requiredRoles.includes(role)) {
        throw new ApiError(httpStatus.FORBIDDEN, 'Access denied');
      }

      next();
    } catch (error) {
      next(error);
    }
  };

export default auth;
