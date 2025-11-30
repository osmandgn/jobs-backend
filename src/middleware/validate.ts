/**
 * Zod Validation Middleware
 */

import { Request, Response, NextFunction } from 'express';
import { z, ZodError, ZodSchema } from 'zod';
import logger from '../utils/logger';

interface ValidationError {
  field: string;
  message: string;
}

/**
 * Format Zod errors into a user-friendly format
 */
function formatZodErrors(error: ZodError): ValidationError[] {
  return error.issues.map((issue) => ({
    field: issue.path.join('.'),
    message: issue.message,
  }));
}

/**
 * Validation middleware factory
 * Creates a middleware that validates request data against a Zod schema
 */
export function validate<T extends ZodSchema>(schema: T) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Parse and validate the request
      const validated = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      }) as { body?: unknown; query?: unknown; params?: unknown };

      // Replace request properties with validated data
      if (validated.body) req.body = validated.body;
      if (validated.query) req.query = validated.query as typeof req.query;
      if (validated.params) req.params = validated.params as typeof req.params;

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = formatZodErrors(error);

        logger.debug('Validation failed', {
          path: req.path,
          method: req.method,
          errors,
        });

        res.status(400).json({
          success: false,
          message: 'Validation error',
          errors,
        });
        return;
      }

      // Re-throw non-Zod errors
      next(error);
    }
  };
}

/**
 * Validate only body
 */
export function validateBody<T extends ZodSchema>(schema: T) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = formatZodErrors(error);
        res.status(400).json({
          success: false,
          message: 'Validation error',
          errors,
        });
        return;
      }
      next(error);
    }
  };
}

/**
 * Validate only query params
 */
export function validateQuery<T extends ZodSchema>(schema: T) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.query = (await schema.parseAsync(req.query)) as typeof req.query;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = formatZodErrors(error);
        res.status(400).json({
          success: false,
          message: 'Validation error',
          errors,
        });
        return;
      }
      next(error);
    }
  };
}

/**
 * Validate only URL params
 */
export function validateParams<T extends ZodSchema>(schema: T) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.params = (await schema.parseAsync(req.params)) as typeof req.params;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = formatZodErrors(error);
        res.status(400).json({
          success: false,
          message: 'Validation error',
          errors,
        });
        return;
      }
      next(error);
    }
  };
}

/**
 * Sanitize string to prevent XSS
 */
export function sanitizeString(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Create a sanitized string schema
 */
export const sanitizedString = z.string().transform(sanitizeString);

export default validate;
