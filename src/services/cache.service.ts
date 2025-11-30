import { getRedisClient } from '../config/redis';
import logger from '../utils/logger';

export class CacheService {
  private redis = getRedisClient();

  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await this.redis.get(key);
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch (error) {
      logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<boolean> {
    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds) {
        await this.redis.setex(key, ttlSeconds, serialized);
      } else {
        await this.redis.set(key, serialized);
      }
      return true;
    } catch (error) {
      logger.error(`Cache set error for key ${key}:`, error);
      return false;
    }
  }

  async setWithExpiry(key: string, value: unknown, seconds: number): Promise<boolean> {
    return this.set(key, value, seconds);
  }

  async del(key: string): Promise<boolean> {
    try {
      await this.redis.del(key);
      return true;
    } catch (error) {
      logger.error(`Cache delete error for key ${key}:`, error);
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      logger.error(`Cache exists error for key ${key}:`, error);
      return false;
    }
  }

  async getOrSet<T>(key: string, fetchFn: () => Promise<T>, ttlSeconds?: number): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const data = await fetchFn();
    await this.set(key, data, ttlSeconds);
    return data;
  }

  async invalidatePattern(pattern: string): Promise<number> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length === 0) return 0;
      const deleted = await this.redis.del(...keys);
      logger.debug(`Invalidated ${deleted} keys matching pattern: ${pattern}`);
      return deleted;
    } catch (error) {
      logger.error(`Cache invalidate pattern error for ${pattern}:`, error);
      return 0;
    }
  }

  async increment(key: string): Promise<number> {
    try {
      return await this.redis.incr(key);
    } catch (error) {
      logger.error(`Cache increment error for key ${key}:`, error);
      return 0;
    }
  }

  async decrement(key: string): Promise<number> {
    try {
      return await this.redis.decr(key);
    } catch (error) {
      logger.error(`Cache decrement error for key ${key}:`, error);
      return 0;
    }
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    try {
      await this.redis.expire(key, seconds);
      return true;
    } catch (error) {
      logger.error(`Cache expire error for key ${key}:`, error);
      return false;
    }
  }

  async setHash(key: string, field: string, value: unknown): Promise<boolean> {
    try {
      const serialized = JSON.stringify(value);
      await this.redis.hset(key, field, serialized);
      return true;
    } catch (error) {
      logger.error(`Cache setHash error for key ${key}:`, error);
      return false;
    }
  }

  async getHash<T>(key: string, field: string): Promise<T | null> {
    try {
      const data = await this.redis.hget(key, field);
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch (error) {
      logger.error(`Cache getHash error for key ${key}:`, error);
      return null;
    }
  }

  async getAllHash<T>(key: string): Promise<Record<string, T> | null> {
    try {
      const data = await this.redis.hgetall(key);
      if (!data || Object.keys(data).length === 0) return null;

      const result: Record<string, T> = {};
      for (const [field, value] of Object.entries(data)) {
        result[field] = JSON.parse(value) as T;
      }
      return result;
    } catch (error) {
      logger.error(`Cache getAllHash error for key ${key}:`, error);
      return null;
    }
  }

  async delHash(key: string, field: string): Promise<boolean> {
    try {
      await this.redis.hdel(key, field);
      return true;
    } catch (error) {
      logger.error(`Cache delHash error for key ${key}:`, error);
      return false;
    }
  }

  // Token blacklist methods
  async addToBlacklist(token: string, expiresInSeconds: number): Promise<boolean> {
    const key = `blacklist:${token}`;
    return this.setWithExpiry(key, true, expiresInSeconds);
  }

  async isBlacklisted(token: string): Promise<boolean> {
    const key = `blacklist:${token}`;
    return this.exists(key);
  }

  // View counting with debounce
  async incrementViewCount(
    entityType: string,
    entityId: string,
    userId: string | null,
    debounceSeconds: number = 3600
  ): Promise<boolean> {
    const viewKey = userId
      ? `view:${entityType}:${entityId}:user:${userId}`
      : `view:${entityType}:${entityId}:anon`;

    const alreadyViewed = await this.exists(viewKey);
    if (alreadyViewed) {
      return false;
    }

    await this.setWithExpiry(viewKey, true, debounceSeconds);
    return true;
  }
}

export const cacheService = new CacheService();
export default cacheService;
