export interface SystemOverview {
  uptime: number;
  uptimeFormatted: string;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu: {
    loadAverage: number[];
    cores: number;
    usage: number;
  };
  activeConnections: number;
  redis: {
    status: 'connected' | 'disconnected';
    memoryUsage?: string;
    uptime?: number;
  };
  database: {
    status: 'connected' | 'disconnected';
    responseTime?: number;
  };
  nodeVersion: string;
  platform: string;
}

export interface ApiMetrics {
  requestsToday: number;
  requestsThisHour: number;
  totalRequests: number;
  errorCount: number;
  errorRate: number;
  avgResponseTime: number;
  p95ResponseTime: number;
  requestsByHour: Array<{
    hour: string;
    count: number;
    errors: number;
  }>;
}

export interface EndpointMetrics {
  endpoint: string;
  method: string;
  count: number;
  avgResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  errorCount: number;
  errorRate: number;
  lastCalled: Date;
}

export interface ErrorRecord {
  id: string;
  type: string;
  code: string;
  message: string;
  stack?: string;
  endpoint: string;
  method: string;
  statusCode: number;
  timestamp: Date;
  requestId?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

export interface ErrorTrend {
  date: string;
  hour?: number;
  count: number;
  types: Record<string, number>;
}

export interface QueryMetrics {
  query: string;
  model: string;
  operation: string;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  count: number;
  lastExecuted: Date;
}

export interface LogEntry {
  id: string;
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  message: string;
  timestamp: Date;
  requestId?: string;
  metadata?: Record<string, unknown>;
  source?: string;
}

export interface MonitoringFilters {
  startDate?: Date;
  endDate?: Date;
  level?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface RequestMetricData {
  endpoint: string;
  method: string;
  statusCode: number;
  duration: number;
  timestamp: Date;
  requestId?: string;
  userId?: string;
  error?: string;
}
