import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { sendError } from '../utils/response';
import { ErrorCodes } from '../utils/AppError';

type RequestLocation = 'body' | 'query' | 'params';

export function validate(schema: ZodSchema, location: RequestLocation = 'body') {
  return (req: Request, res: Response, next: NextFunction): void | Response => {
    try {
      const data = req[location];
      const parsed = schema.parse(data);

      // Replace the request data with parsed/transformed data
      req[location] = parsed;

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        }));

        return sendError(res, ErrorCodes.VALIDATION_FAILED, 'Validation failed', 422, {
          errors: details,
        });
      }
      next(error);
    }
  };
}

export const validateBody = (schema: ZodSchema) => validate(schema, 'body');
export const validateQuery = (schema: ZodSchema) => validate(schema, 'query');
export const validateParams = (schema: ZodSchema) => validate(schema, 'params');

export default validate;
