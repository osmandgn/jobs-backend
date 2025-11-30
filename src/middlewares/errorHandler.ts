import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { AppError, ErrorCodes } from '../utils/AppError';
import logger from '../utils/logger';
import { sendError } from '../utils/response';
import { config } from '../config';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): Response {
  const requestId = req.requestId || 'unknown';

  // Log error
  logger.error(`[${requestId}] Error:`, {
    name: err.name,
    message: err.message,
    stack: config.env !== 'production' ? err.stack : undefined,
    path: req.path,
    method: req.method,
  });

  // Handle AppError (our custom errors)
  if (err instanceof AppError) {
    return sendError(
      res,
      err.code,
      err.message,
      err.statusCode,
      config.env !== 'production' ? err.details : undefined
    );
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const zodError = err as ZodError;
    const details = zodError.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));

    return sendError(res, ErrorCodes.VALIDATION_FAILED, 'Validation failed', 422, {
      errors: details,
    });
  }

  // Handle Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    return handlePrismaError(err, res);
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    return sendError(res, ErrorCodes.VALIDATION_FAILED, 'Invalid data provided', 400);
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return sendError(res, ErrorCodes.AUTH_TOKEN_INVALID, 'Invalid token', 401);
  }

  if (err.name === 'TokenExpiredError') {
    return sendError(res, ErrorCodes.AUTH_TOKEN_EXPIRED, 'Token expired', 401);
  }

  // Handle syntax errors (e.g., invalid JSON)
  if (err instanceof SyntaxError && 'body' in err) {
    return sendError(res, ErrorCodes.BAD_REQUEST, 'Invalid JSON in request body', 400);
  }

  // Default to 500 Internal Server Error
  const message = config.env === 'production' ? 'Internal server error' : err.message;

  return sendError(res, ErrorCodes.INTERNAL_ERROR, message, 500);
}

function handlePrismaError(
  err: Prisma.PrismaClientKnownRequestError,
  res: Response
): Response {
  switch (err.code) {
    case 'P2002': {
      // Unique constraint violation
      const target = (err.meta?.target as string[])?.join(', ') || 'field';
      return sendError(
        res,
        'UNIQUE_VIOLATION',
        `A record with this ${target} already exists`,
        409
      );
    }
    case 'P2003': {
      // Foreign key constraint violation
      return sendError(res, 'FOREIGN_KEY_VIOLATION', 'Referenced record does not exist', 400);
    }
    case 'P2025': {
      // Record not found
      return sendError(res, ErrorCodes.NOT_FOUND, 'Record not found', 404);
    }
    default: {
      return sendError(res, 'DATABASE_ERROR', 'Database operation failed', 500);
    }
  }
}

export function notFoundHandler(req: Request, res: Response): Response {
  return sendError(
    res,
    ErrorCodes.NOT_FOUND,
    `Route ${req.method} ${req.path} not found`,
    404
  );
}

export default errorHandler;
