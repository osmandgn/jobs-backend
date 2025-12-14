import { Request, Response, NextFunction } from 'express';
import {
  systemMetricsService,
  apiMetricsService,
  errorTrackingService,
  queryAnalyticsService,
  logsService,
} from '../../services/monitoring';

export class MonitoringController {
  async getSystemOverview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const overview = await systemMetricsService.getSystemOverview();

      res.json({
        success: true,
        data: overview,
      });
    } catch (error) {
      next(error);
    }
  }

  async getApiMetrics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const metrics = await apiMetricsService.getApiMetrics();

      res.json({
        success: true,
        data: metrics,
      });
    } catch (error) {
      next(error);
    }
  }

  async getEndpointMetrics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const sort = (req.query.sort as 'count' | 'avgTime') || 'count';

      const metrics = await apiMetricsService.getEndpointMetrics(limit, sort);

      res.json({
        success: true,
        data: metrics,
      });
    } catch (error) {
      next(error);
    }
  }

  async getSlowestEndpoints(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const metrics = await apiMetricsService.getSlowestEndpoints(limit);

      res.json({
        success: true,
        data: metrics,
      });
    } catch (error) {
      next(error);
    }
  }

  async getErrors(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const type = req.query.type as string | undefined;

      const [errors, types] = await Promise.all([
        errorTrackingService.getRecentErrors(limit, type),
        errorTrackingService.getErrorTypes(),
      ]);

      res.json({
        success: true,
        data: {
          errors,
          types,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getErrorTrends(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const days = parseInt(req.query.days as string) || 7;
      const trends = await errorTrackingService.getErrorTrends(days);

      res.json({
        success: true,
        data: trends,
      });
    } catch (error) {
      next(error);
    }
  }

  async getErrorsByType(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const date = req.query.date as string | undefined;
      const errorsByType = await errorTrackingService.getErrorsByType(date);

      res.json({
        success: true,
        data: errorsByType,
      });
    } catch (error) {
      next(error);
    }
  }

  async getQueryAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 20;

      const [slowQueries, frequentQueries, rawSlowQueries] = await Promise.all([
        queryAnalyticsService.getSlowestQueries(limit),
        queryAnalyticsService.getMostFrequentQueries(limit),
        queryAnalyticsService.getSlowQueries(limit),
      ]);

      res.json({
        success: true,
        data: {
          slowQueries,
          frequentQueries,
          rawSlowQueries,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const level = req.query.level as string | undefined;
      const search = req.query.search as string | undefined;
      const limit = parseInt(req.query.limit as string) || 100;
      const offset = parseInt(req.query.offset as string) || 0;

      const logs = logsService.getLogs({
        level,
        search,
        limit,
        offset,
      });

      const logsByLevel = logsService.getLogsByLevel();

      res.json({
        success: true,
        data: {
          logs,
          stats: logsByLevel,
          total: logs.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const monitoringController = new MonitoringController();
