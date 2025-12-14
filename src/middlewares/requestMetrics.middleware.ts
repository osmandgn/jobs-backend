import { Request, Response, NextFunction } from 'express';
import { apiMetricsService } from '../services/monitoring/apiMetrics.service';
import { systemMetricsService } from '../services/monitoring/systemMetrics.service';

export const requestMetricsMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();

  // Track active connections
  systemMetricsService.incrementConnections();

  // Track metrics on response finish
  res.on('finish', () => {
    const duration = Date.now() - startTime;

    // Decrement active connections
    systemMetricsService.decrementConnections();

    // Record the request metrics (async, non-blocking)
    setImmediate(() => {
      apiMetricsService.recordRequest({
        endpoint: req.route?.path || req.path,
        method: req.method,
        statusCode: res.statusCode,
        duration,
        timestamp: new Date(),
        requestId: req.requestId,
        userId: (req as any).user?.id,
        error: res.statusCode >= 400 ? res.statusMessage : undefined,
      });
    });
  });

  next();
};
