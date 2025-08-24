import { ErrorRequestHandler, NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import config from '../../config';
import ApiError from '../../errors/ApiError';

import handleZodError from '../../errors/handleZodError';
import { IGenericErrorMessage } from '../../interfaces/error';
import { errorlogger } from '../../shared/logger';
import handleCastError from '../../errors/handleCastError';

const globalErrorHandler: ErrorRequestHandler = (
  error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log the error based on environment
  if (config.env === 'development') {
    console.log(`🐱‍🏍 globalErrorHandler ~~`, error);
  } else {
    errorlogger.error(`🐱‍🏍 globalErrorHandler ~~`, error);
  }

  // Default values
  let statusCode = 500;
  let message = 'Something went wrong!';
  let errorMessages: IGenericErrorMessage[] = [];

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const simplifiedError = handleZodError(error);
    statusCode = simplifiedError.statusCode;
    message = simplifiedError.message;
    errorMessages = simplifiedError.errorMessages;
  }

  // Handle custom ApiError
  else if (error instanceof ApiError) {
    statusCode = error.statusCode || 500;
    message = error.message;
    errorMessages = error.message
      ? [
          {
            path: '',
            message: error.message,
          },
        ]
      : [];
  }

  // Handle other generic JS errors (like throw new Error)
  else if (error instanceof Error) {
    message = error.message;
    errorMessages = error.message
      ? [
          {
            path: '',
            message: error.message,
          },
        ]
      : [];
  }

  // Handle raw SQL or cast errors (optional)
  else if ((error as any)?.code) {
    const simplifiedError = handleCastError(error);
    statusCode = simplifiedError.statusCode;
    message = simplifiedError.message;
    errorMessages = simplifiedError.errorMessages;
  }

  // Final response
  res.status(statusCode).json({
    success: false,
    message,
    errorMessages,
    ...(config.env !== 'production' && { stack: error.stack }),
  });
};

export default globalErrorHandler;
