export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    statusCode: number,
    code: string,
    isOperational = true,
    details?: Record<string, unknown>
  ) {
    super(message);

    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request', code = 'BAD_REQUEST', details?: Record<string, unknown>) {
    super(message, 400, code, true, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(
    message = 'Unauthorized',
    code = 'UNAUTHORIZED',
    details?: Record<string, unknown>
  ) {
    super(message, 401, code, true, details);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden', code = 'FORBIDDEN', details?: Record<string, unknown>) {
    super(message, 403, code, true, details);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not found', code = 'NOT_FOUND', details?: Record<string, unknown>) {
    super(message, 404, code, true, details);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict', code = 'CONFLICT', details?: Record<string, unknown>) {
    super(message, 409, code, true, details);
  }
}

export class ValidationError extends AppError {
  constructor(
    message = 'Validation failed',
    code = 'VALIDATION_ERROR',
    details?: Record<string, unknown>
  ) {
    super(message, 422, code, true, details);
  }
}

export class TooManyRequestsError extends AppError {
  constructor(
    message = 'Too many requests',
    code = 'RATE_LIMIT_EXCEEDED',
    details?: Record<string, unknown>
  ) {
    super(message, 429, code, true, details);
  }
}

export class InternalServerError extends AppError {
  constructor(
    message = 'Internal server error',
    code = 'INTERNAL_ERROR',
    details?: Record<string, unknown>
  ) {
    super(message, 500, code, false, details);
  }
}

export const ErrorCodes = {
  // Auth Errors (AUTH_XXX)
  AUTH_INVALID_CREDENTIALS: 'AUTH_001',
  AUTH_EMAIL_NOT_VERIFIED: 'AUTH_002',
  AUTH_TOKEN_EXPIRED: 'AUTH_003',
  AUTH_TOKEN_INVALID: 'AUTH_004',
  AUTH_USER_SUSPENDED: 'AUTH_005',
  AUTH_USER_BANNED: 'AUTH_006',
  AUTH_REFRESH_TOKEN_INVALID: 'AUTH_007',
  AUTH_PASSWORD_MISMATCH: 'AUTH_008',

  // User Errors (USER_XXX)
  USER_NOT_FOUND: 'USER_001',
  USER_EMAIL_EXISTS: 'USER_002',
  USER_PHONE_EXISTS: 'USER_003',
  USER_BLOCKED: 'USER_004',

  // Job Errors (JOB_XXX)
  JOB_NOT_FOUND: 'JOB_001',
  JOB_NOT_ACTIVE: 'JOB_002',
  JOB_EXPIRED: 'JOB_003',
  JOB_CANNOT_APPLY_OWN: 'JOB_004',
  JOB_ALREADY_APPLIED: 'JOB_005',

  // Application Errors (APP_XXX)
  APPLICATION_NOT_FOUND: 'APP_001',
  APPLICATION_ALREADY_EXISTS: 'APP_002',
  APPLICATION_NOT_PENDING: 'APP_003',

  // Message/Conversation Errors (MSG_XXX)
  CONVERSATION_NOT_FOUND: 'MSG_001',
  MESSAGE_NOT_PARTICIPANT: 'MSG_002',
  MESSAGE_BLOCKED: 'MSG_003',
  MESSAGE_NOT_FOUND: 'MSG_004',
  MESSAGE_NOT_ALLOWED: 'MSG_005',
  MESSAGE_RECIPIENT_NOT_AVAILABLE: 'MSG_006',

  // Review Errors (REV_XXX)
  REVIEW_NOT_ELIGIBLE: 'REV_001',
  REVIEW_ALREADY_EXISTS: 'REV_002',
  REVIEW_WINDOW_EXPIRED: 'REV_003',

  // Report Errors (RPT_XXX)
  REPORT_DUPLICATE: 'RPT_001',
  REPORT_NOT_FOUND: 'RPT_002',

  // Validation Errors (VAL_XXX)
  VALIDATION_FAILED: 'VAL_001',
  VALIDATION_INVALID_POSTCODE: 'VAL_002',
  VALIDATION_INVALID_PHONE: 'VAL_003',

  // Rate Limit Errors (RATE_XXX)
  RATE_LIMIT_EXCEEDED: 'RATE_001',

  // General Errors (GEN_XXX)
  INTERNAL_ERROR: 'GEN_001',
  NOT_FOUND: 'GEN_002',
  BAD_REQUEST: 'GEN_003',
  FORBIDDEN: 'GEN_004',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

export default AppError;
