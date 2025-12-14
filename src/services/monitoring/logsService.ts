import { LogEntry, MonitoringFilters } from '../../types/monitoring';
import { v4 as uuidv4 } from 'uuid';

const MAX_LOGS = 500;

class LogsService {
  private logs: LogEntry[] = [];

  addLog(entry: Omit<LogEntry, 'id' | 'timestamp'>): void {
    const log: LogEntry = {
      id: uuidv4(),
      timestamp: new Date(),
      ...entry,
    };

    this.logs.unshift(log);

    // Keep only the last MAX_LOGS entries
    if (this.logs.length > MAX_LOGS) {
      this.logs = this.logs.slice(0, MAX_LOGS);
    }
  }

  getLogs(filters?: MonitoringFilters): LogEntry[] {
    let result = [...this.logs];

    if (filters?.level) {
      const levels = filters.level.split(',').map(l => l.trim().toUpperCase());
      result = result.filter(log => levels.includes(log.level));
    }

    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(log =>
        log.message.toLowerCase().includes(searchLower) ||
        log.requestId?.toLowerCase().includes(searchLower) ||
        log.source?.toLowerCase().includes(searchLower)
      );
    }

    if (filters?.startDate) {
      result = result.filter(log => new Date(log.timestamp) >= new Date(filters.startDate!));
    }

    if (filters?.endDate) {
      result = result.filter(log => new Date(log.timestamp) <= new Date(filters.endDate!));
    }

    const offset = filters?.offset || 0;
    const limit = filters?.limit || 100;

    return result.slice(offset, offset + limit);
  }

  getLogsByLevel(): Record<string, number> {
    const counts: Record<string, number> = {
      DEBUG: 0,
      INFO: 0,
      WARN: 0,
      ERROR: 0,
    };

    for (const log of this.logs) {
      counts[log.level] = (counts[log.level] || 0) + 1;
    }

    return counts;
  }

  clearLogs(): void {
    this.logs = [];
  }

  getRecentLogs(count: number = 100): LogEntry[] {
    return this.logs.slice(0, count);
  }
}

export const logsService = new LogsService();

// Hook into Winston logger to capture logs
export function captureLog(
  level: LogEntry['level'],
  message: string,
  metadata?: Record<string, unknown>
): void {
  logsService.addLog({
    level,
    message,
    metadata,
    requestId: (metadata as any)?.requestId,
    source: (metadata as any)?.source || 'app',
  });
}
