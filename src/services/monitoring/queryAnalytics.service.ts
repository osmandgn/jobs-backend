import { getRedisClient } from '../../config/redis';
import { QueryMetrics } from '../../types/monitoring';

const SLOW_QUERY_THRESHOLD = 100; // ms
const MAX_QUERIES = 100;

class QueryAnalyticsService {
  private get redis() {
    return getRedisClient();
  }

  async recordQuery(data: {
    query: string;
    model: string;
    operation: string;
    duration: number;
  }): Promise<void> {
    const queryKey = `${data.model}:${data.operation}`;

    try {
      const pipeline = this.redis.pipeline();

      // Record query execution time
      pipeline.lpush(`monitoring:query:times:${queryKey}`, data.duration.toString());
      pipeline.ltrim(`monitoring:query:times:${queryKey}`, 0, 99);
      pipeline.expire(`monitoring:query:times:${queryKey}`, 3600);

      // Increment query count
      pipeline.hincrby('monitoring:query:counts', queryKey, 1);
      pipeline.expire('monitoring:query:counts', 3600);

      // Store last execution time
      pipeline.hset('monitoring:query:last', queryKey, Date.now().toString());
      pipeline.expire('monitoring:query:last', 3600);

      // Track slow queries
      if (data.duration >= SLOW_QUERY_THRESHOLD) {
        const slowQuery = JSON.stringify({
          query: data.query.substring(0, 500),
          model: data.model,
          operation: data.operation,
          duration: data.duration,
          timestamp: new Date().toISOString(),
        });
        pipeline.lpush('monitoring:query:slow', slowQuery);
        pipeline.ltrim('monitoring:query:slow', 0, MAX_QUERIES - 1);
        pipeline.expire('monitoring:query:slow', 3600);
      }

      await pipeline.exec();
    } catch (error) {
      console.error('Failed to record query:', error);
    }
  }

  async getQueryMetrics(limit: number = 20, sort: 'count' | 'avgTime' = 'count'): Promise<QueryMetrics[]> {
    try {
      const [counts, lastTimes] = await Promise.all([
        this.redis.hgetall('monitoring:query:counts'),
        this.redis.hgetall('monitoring:query:last'),
      ]);

      const metrics: QueryMetrics[] = [];

      for (const [queryKey, countStr] of Object.entries(counts)) {
        const [model, operation] = queryKey.split(':');
        const count = parseInt(countStr, 10);

        const times = await this.redis.lrange(`monitoring:query:times:${queryKey}`, 0, -1);
        const durations = times.map((t: string) => parseInt(t, 10));

        const avgDuration = durations.length > 0
          ? Math.round(durations.reduce((a: number, b: number) => a + b, 0) / durations.length)
          : 0;
        const minDuration = durations.length > 0 ? Math.min(...durations) : 0;
        const maxDuration = durations.length > 0 ? Math.max(...durations) : 0;

        const lastExecuted = lastTimes[queryKey]
          ? new Date(parseInt(lastTimes[queryKey], 10))
          : new Date();

        metrics.push({
          query: queryKey,
          model: model || 'unknown',
          operation: operation || 'unknown',
          avgDuration,
          minDuration,
          maxDuration,
          count,
          lastExecuted,
        });
      }

      // Sort by specified field
      if (sort === 'avgTime') {
        metrics.sort((a, b) => b.avgDuration - a.avgDuration);
      } else {
        metrics.sort((a, b) => b.count - a.count);
      }

      return metrics.slice(0, limit);
    } catch (error) {
      console.error('Failed to get query metrics:', error);
      return [];
    }
  }

  async getSlowQueries(limit: number = 20): Promise<any[]> {
    try {
      const slowQueries = await this.redis.lrange('monitoring:query:slow', 0, limit - 1);
      return slowQueries.map((q: string) => JSON.parse(q));
    } catch (error) {
      console.error('Failed to get slow queries:', error);
      return [];
    }
  }

  async getMostFrequentQueries(limit: number = 10): Promise<QueryMetrics[]> {
    return this.getQueryMetrics(limit, 'count');
  }

  async getSlowestQueries(limit: number = 10): Promise<QueryMetrics[]> {
    return this.getQueryMetrics(limit, 'avgTime');
  }
}

export const queryAnalyticsService = new QueryAnalyticsService();
