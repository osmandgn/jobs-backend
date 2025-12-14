import os from 'os';
import { getRedisClient } from '../../config/redis';
import { prisma } from '../../config/database';
import { SystemOverview } from '../../types/monitoring';

const CACHE_KEY = 'monitoring:system';
const CACHE_TTL = 15;

class SystemMetricsService {
  private startTime: number;
  private activeConnections: number = 0;

  constructor() {
    this.startTime = Date.now();
  }

  private get redis() {
    return getRedisClient();
  }

  incrementConnections(): void {
    this.activeConnections++;
  }

  decrementConnections(): void {
    this.activeConnections = Math.max(0, this.activeConnections - 1);
  }

  getActiveConnections(): number {
    return this.activeConnections;
  }

  private formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

    return parts.join(' ');
  }

  private getCpuUsage(): number {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    for (const cpu of cpus) {
      for (const type in cpu.times) {
        totalTick += cpu.times[type as keyof typeof cpu.times];
      }
      totalIdle += cpu.times.idle;
    }

    return Math.round((1 - totalIdle / totalTick) * 100);
  }

  async getRedisStatus(): Promise<SystemOverview['redis']> {
    try {
      const ping = await this.redis.ping();
      if (ping === 'PONG') {
        const info = await this.redis.info('memory');
        const memoryMatch = info.match(/used_memory_human:(\S+)/);
        const uptimeMatch = info.match(/uptime_in_seconds:(\d+)/);

        return {
          status: 'connected',
          memoryUsage: memoryMatch?.[1] ?? undefined,
          uptime: uptimeMatch?.[1] ? parseInt(uptimeMatch[1], 10) : undefined,
        };
      }
      return { status: 'disconnected' };
    } catch {
      return { status: 'disconnected' };
    }
  }

  async getDatabaseStatus(): Promise<SystemOverview['database']> {
    try {
      const start = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      const responseTime = Date.now() - start;

      return {
        status: 'connected',
        responseTime,
      };
    } catch {
      return { status: 'disconnected' };
    }
  }

  async getSystemOverview(): Promise<SystemOverview> {
    // Try to get from cache first
    try {
      const cached = await this.redis.get(CACHE_KEY);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch {
      // Continue without cache
    }

    const uptime = process.uptime();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    const [redisStatus, dbStatus] = await Promise.all([
      this.getRedisStatus(),
      this.getDatabaseStatus(),
    ]);

    const overview: SystemOverview = {
      uptime,
      uptimeFormatted: this.formatUptime(uptime),
      memory: {
        used: usedMem,
        total: totalMem,
        percentage: Math.round((usedMem / totalMem) * 100),
      },
      cpu: {
        loadAverage: os.loadavg(),
        cores: os.cpus().length,
        usage: this.getCpuUsage(),
      },
      activeConnections: this.activeConnections,
      redis: redisStatus,
      database: dbStatus,
      nodeVersion: process.version,
      platform: `${os.type()} ${os.release()}`,
    };

    // Cache the result
    try {
      await this.redis.setex(CACHE_KEY, CACHE_TTL, JSON.stringify(overview));
    } catch {
      // Continue without caching
    }

    return overview;
  }
}

export const systemMetricsService = new SystemMetricsService();
