import { getRedisClient } from '../../config/redis';
import { ErrorRecord, ErrorTrend } from '../../types/monitoring';
import { v4 as uuidv4 } from 'uuid';

const MAX_ERRORS = 100;
const ERRORS_KEY = 'monitoring:errors:recent';

class ErrorTrackingService {
  private get redis() {
    return getRedisClient();
  }

  async recordError(error: {
    type: string;
    code: string;
    message: string;
    stack?: string;
    endpoint: string;
    method: string;
    statusCode: number;
    requestId?: string;
    userId?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    const dateStr = new Date().toISOString().split('T')[0];
    const date = dateStr || new Date().toISOString().substring(0, 10);
    const hour = new Date().getHours();

    const errorRecord: ErrorRecord = {
      id: uuidv4(),
      ...error,
      timestamp: new Date(),
    };

    try {
      const pipeline = this.redis.pipeline();

      // Add to recent errors list
      pipeline.lpush(ERRORS_KEY, JSON.stringify(errorRecord));
      pipeline.ltrim(ERRORS_KEY, 0, MAX_ERRORS - 1);

      // Track error by type
      pipeline.hincrby(`monitoring:errors:types:${date}`, error.type, 1);
      pipeline.expire(`monitoring:errors:types:${date}`, 86400 * 7);

      // Track error by hour for trends
      pipeline.hincrby(`monitoring:errors:hourly:${date}`, hour.toString(), 1);
      pipeline.expire(`monitoring:errors:hourly:${date}`, 86400 * 7);

      // Track error by endpoint
      pipeline.hincrby(`monitoring:errors:endpoints:${date}`, `${error.method}:${error.endpoint}`, 1);
      pipeline.expire(`monitoring:errors:endpoints:${date}`, 86400 * 7);

      await pipeline.exec();
    } catch (err) {
      console.error('Failed to record error:', err);
    }
  }

  async getRecentErrors(limit: number = 50, type?: string): Promise<ErrorRecord[]> {
    try {
      const errors = await this.redis.lrange(ERRORS_KEY, 0, limit * 2);
      let parsed = errors.map((e: string) => JSON.parse(e) as ErrorRecord);

      if (type) {
        parsed = parsed.filter((e: ErrorRecord) => e.type === type);
      }

      return parsed.slice(0, limit);
    } catch (error) {
      console.error('Failed to get recent errors:', error);
      return [];
    }
  }

  async getErrorTrends(days: number = 7): Promise<ErrorTrend[]> {
    const trends: ErrorTrend[] = [];

    try {
      for (let i = 0; i < days; i++) {
        const dateObj = new Date();
        dateObj.setDate(dateObj.getDate() - i);
        const dateStr = dateObj.toISOString().split('T')[0];
        const dateKey = dateStr || dateObj.toISOString().substring(0, 10);

        const [hourlyData, typeData] = await Promise.all([
          this.redis.hgetall(`monitoring:errors:hourly:${dateKey}`),
          this.redis.hgetall(`monitoring:errors:types:${dateKey}`),
        ]);

        const totalCount = Object.values(hourlyData).reduce((sum: number, val: string) => sum + parseInt(val, 10), 0);
        const types: Record<string, number> = {};

        for (const [type, count] of Object.entries(typeData)) {
          types[type] = parseInt(count, 10);
        }

        trends.push({
          date: dateKey,
          count: totalCount,
          types,
        });
      }

      return trends.reverse();
    } catch (error) {
      console.error('Failed to get error trends:', error);
      return [];
    }
  }

  async getErrorsByType(date?: string): Promise<Record<string, number>> {
    const dateStr = date || new Date().toISOString().split('T')[0];
    const dateKey = dateStr || new Date().toISOString().substring(0, 10);

    try {
      const typeData = await this.redis.hgetall(`monitoring:errors:types:${dateKey}`);
      const result: Record<string, number> = {};

      for (const [type, count] of Object.entries(typeData)) {
        result[type] = parseInt(count, 10);
      }

      return result;
    } catch (error) {
      console.error('Failed to get errors by type:', error);
      return {};
    }
  }

  async getErrorTypes(): Promise<string[]> {
    try {
      const errors = await this.getRecentErrors(100);
      const types = new Set(errors.map((e: ErrorRecord) => e.type));
      return Array.from(types);
    } catch {
      return [];
    }
  }
}

export const errorTrackingService = new ErrorTrackingService();
