import { getRedisClient } from '../../config/redis';
import { ApiMetrics, EndpointMetrics, RequestMetricData } from '../../types/monitoring';

class ApiMetricsService {
  private get redis() {
    return getRedisClient();
  }
  private getDateKey(): string {
    const dateStr = new Date().toISOString().split('T')[0];
    return dateStr || new Date().toISOString().substring(0, 10);
  }

  private getHourKey(): number {
    return new Date().getHours();
  }

  async recordRequest(data: RequestMetricData): Promise<void> {
    const date = this.getDateKey();
    const hour = this.getHourKey();
    const endpointKey = `${data.method}:${data.endpoint}`;

    try {
      const pipeline = this.redis.pipeline();

      // Increment total requests for today
      pipeline.incr(`monitoring:requests:${date}:total`);
      pipeline.expire(`monitoring:requests:${date}:total`, 86400 * 2);

      // Increment hourly requests
      pipeline.incr(`monitoring:requests:${date}:${hour}`);
      pipeline.expire(`monitoring:requests:${date}:${hour}`, 86400);

      // Track errors
      if (data.statusCode >= 400) {
        pipeline.incr(`monitoring:errors:${date}:total`);
        pipeline.expire(`monitoring:errors:${date}:total`, 86400 * 2);
        pipeline.incr(`monitoring:errors:${date}:${hour}`);
        pipeline.expire(`monitoring:errors:${date}:${hour}`, 86400);
      }

      // Increment endpoint counter (sorted set)
      pipeline.zincrby(`monitoring:endpoints:${date}`, 1, endpointKey);
      pipeline.expire(`monitoring:endpoints:${date}`, 86400 * 2);

      // Record response time
      pipeline.lpush(`monitoring:response:${endpointKey}`, data.duration.toString());
      pipeline.ltrim(`monitoring:response:${endpointKey}`, 0, 99);
      pipeline.expire(`monitoring:response:${endpointKey}`, 86400);

      // Track endpoint errors
      if (data.statusCode >= 400) {
        pipeline.incr(`monitoring:endpoint:errors:${endpointKey}:${date}`);
        pipeline.expire(`monitoring:endpoint:errors:${endpointKey}:${date}`, 86400 * 2);
      }

      // Store last call time
      pipeline.set(`monitoring:endpoint:last:${endpointKey}`, Date.now().toString());
      pipeline.expire(`monitoring:endpoint:last:${endpointKey}`, 86400);

      await pipeline.exec();
    } catch (error) {
      // Silent fail - don't break the request
      console.error('Failed to record metrics:', error);
    }
  }

  async getApiMetrics(): Promise<ApiMetrics> {
    const date = this.getDateKey();
    const hour = this.getHourKey();

    try {
      const [
        requestsToday,
        requestsThisHour,
        errorsToday,
        errorsThisHour,
      ] = await Promise.all([
        this.redis.get(`monitoring:requests:${date}:total`),
        this.redis.get(`monitoring:requests:${date}:${hour}`),
        this.redis.get(`monitoring:errors:${date}:total`),
        this.redis.get(`monitoring:errors:${date}:${hour}`),
      ]);

      const totalRequests = parseInt(requestsToday || '0', 10);
      const hourlyRequests = parseInt(requestsThisHour || '0', 10);
      const totalErrors = parseInt(errorsToday || '0', 10);

      // Get response times from top endpoints
      const topEndpoints = await this.redis.zrevrange(`monitoring:endpoints:${date}`, 0, 9);
      let allResponseTimes: number[] = [];

      for (const endpoint of topEndpoints) {
        const times = await this.redis.lrange(`monitoring:response:${endpoint}`, 0, -1);
        allResponseTimes = allResponseTimes.concat(times.map((t: string) => parseInt(t, 10)));
      }

      const avgResponseTime = allResponseTimes.length > 0
        ? Math.round(allResponseTimes.reduce((a, b) => a + b, 0) / allResponseTimes.length)
        : 0;

      const sortedTimes = [...allResponseTimes].sort((a, b) => a - b);
      const p95Index = Math.floor(sortedTimes.length * 0.95);
      const p95ResponseTime = sortedTimes[p95Index] || 0;

      // Get requests by hour for chart
      const requestsByHour: ApiMetrics['requestsByHour'] = [];
      for (let h = 0; h <= hour; h++) {
        const [hourRequests, hourErrors] = await Promise.all([
          this.redis.get(`monitoring:requests:${date}:${h}`),
          this.redis.get(`monitoring:errors:${date}:${h}`),
        ]);
        requestsByHour.push({
          hour: `${h.toString().padStart(2, '0')}:00`,
          count: parseInt(hourRequests || '0', 10),
          errors: parseInt(hourErrors || '0', 10),
        });
      }

      return {
        requestsToday: totalRequests,
        requestsThisHour: hourlyRequests,
        totalRequests,
        errorCount: totalErrors,
        errorRate: totalRequests > 0 ? Math.round((totalErrors / totalRequests) * 100 * 100) / 100 : 0,
        avgResponseTime,
        p95ResponseTime,
        requestsByHour,
      };
    } catch (error) {
      console.error('Failed to get API metrics:', error);
      return {
        requestsToday: 0,
        requestsThisHour: 0,
        totalRequests: 0,
        errorCount: 0,
        errorRate: 0,
        avgResponseTime: 0,
        p95ResponseTime: 0,
        requestsByHour: [],
      };
    }
  }

  async getEndpointMetrics(limit: number = 10, sort: 'count' | 'avgTime' = 'count'): Promise<EndpointMetrics[]> {
    const date = this.getDateKey();

    try {
      const endpoints = await this.redis.zrevrange(`monitoring:endpoints:${date}`, 0, limit * 2, 'WITHSCORES');
      const metrics: EndpointMetrics[] = [];

      for (let i = 0; i < endpoints.length; i += 2) {
        const endpointKey = endpoints[i];
        const countStr = endpoints[i + 1];

        if (!endpointKey || !countStr) continue;

        const count = parseInt(countStr, 10);

        const [method, ...pathParts] = endpointKey.split(':');
        const endpoint = pathParts.join(':');

        const [responseTimes, errorCount, lastCalled] = await Promise.all([
          this.redis.lrange(`monitoring:response:${endpointKey}`, 0, -1),
          this.redis.get(`monitoring:endpoint:errors:${endpointKey}:${date}`),
          this.redis.get(`monitoring:endpoint:last:${endpointKey}`),
        ]);

        const times = responseTimes.map((t: string) => parseInt(t, 10));
        const avgTime = times.length > 0 ? Math.round(times.reduce((a: number, b: number) => a + b, 0) / times.length) : 0;
        const minTime = times.length > 0 ? Math.min(...times) : 0;
        const maxTime = times.length > 0 ? Math.max(...times) : 0;
        const errors = parseInt(errorCount || '0', 10);

        metrics.push({
          endpoint,
          method: method || 'GET',
          count,
          avgResponseTime: avgTime,
          minResponseTime: minTime,
          maxResponseTime: maxTime,
          errorCount: errors,
          errorRate: count > 0 ? Math.round((errors / count) * 100 * 100) / 100 : 0,
          lastCalled: new Date(parseInt(lastCalled || '0', 10)),
        });
      }

      // Sort by specified field
      if (sort === 'avgTime') {
        metrics.sort((a, b) => b.avgResponseTime - a.avgResponseTime);
      }

      return metrics.slice(0, limit);
    } catch (error) {
      console.error('Failed to get endpoint metrics:', error);
      return [];
    }
  }

  async getSlowestEndpoints(limit: number = 10): Promise<EndpointMetrics[]> {
    return this.getEndpointMetrics(limit, 'avgTime');
  }
}

export const apiMetricsService = new ApiMetricsService();
