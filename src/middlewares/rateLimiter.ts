import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { getRedisClient } from '../config/redis';
import { sendError } from '../utils/response';
import { ErrorCodes } from '../utils/AppError';
import { config } from '../config';
import logger from '../utils/logger';

class RedisStore {
  private prefix: string;
  private windowMs: number;

  constructor(prefix: string, windowMs: number) {
    this.prefix = prefix;
    this.windowMs = windowMs;
  }

  async increment(key: string): Promise<{ totalHits: number; resetTime: Date | undefined }> {
    const redis = getRedisClient();
    const redisKey = `${this.prefix}:${key}`;

    try {
      const multi = redis.multi();
      multi.incr(redisKey);
      multi.pttl(redisKey);

      const results = await multi.exec();

      if (!results) {
        return { totalHits: 1, resetTime: undefined };
      }

      const totalHits = results[0]?.[1] as number;
      const ttl = results[1]?.[1] as number;

      if (ttl === -1) {
        await redis.pexpire(redisKey, this.windowMs);
      }

      const resetTime = ttl > 0 ? new Date(Date.now() + ttl) : new Date(Date.now() + this.windowMs);

      return { totalHits, resetTime };
    } catch (error) {
      logger.error('Redis rate limit error:', error);
      return { totalHits: 1, resetTime: undefined };
    }
  }

  async decrement(key: string): Promise<void> {
    const redis = getRedisClient();
    const redisKey = `${this.prefix}:${key}`;
    await redis.decr(redisKey);
  }

  async resetKey(key: string): Promise<void> {
    const redis = getRedisClient();
    const redisKey = `${this.prefix}:${key}`;
    await redis.del(redisKey);
  }
}

// Use default key generator from express-rate-limit
// It handles IPv6 validation automatically

const defaultHandler = (_req: Request, res: Response): Response => {
  return sendError(
    res,
    ErrorCodes.RATE_LIMIT_EXCEEDED,
    'Too many requests, please try again later',
    429
  );
};

export const createRateLimiter = (options: {
  windowMs?: number;
  max?: number;
  prefix?: string;
  skipFailedRequests?: boolean;
  skipSuccessfulRequests?: boolean;
}) => {
  const {
    windowMs = config.rateLimit.windowMs,
    max = config.rateLimit.maxRequests,
    prefix = 'rl',
    skipFailedRequests = false,
    skipSuccessfulRequests = false,
  } = options;

  return rateLimit({
    windowMs,
    max,
    handler: defaultHandler,
    skipFailedRequests,
    skipSuccessfulRequests,
    standardHeaders: true,
    legacyHeaders: false,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    store: new RedisStore(prefix, windowMs) as any,
  });
};

export const generalLimiter = createRateLimiter({
  prefix: 'rl:general',
});

export const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  prefix: 'rl:auth',
});

export const registerLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
  prefix: 'rl:register',
});

export const verifyLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 10,
  prefix: 'rl:verify',
});

export const resendLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 3,
  prefix: 'rl:resend',
});

export const forgotPasswordLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 3,
  prefix: 'rl:forgot',
});

export const applicationLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 10,
  prefix: 'rl:application',
});

export default createRateLimiter;
