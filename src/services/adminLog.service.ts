import { prisma } from '../config/database';
import logger from '../utils/logger';
import type { Prisma } from '@prisma/client';

export type AdminActionType =
  | 'user_view'
  | 'user_update'
  | 'user_suspend'
  | 'user_ban'
  | 'user_delete'
  | 'user_unsuspend'
  | 'job_view'
  | 'job_update'
  | 'job_approve'
  | 'job_reject'
  | 'job_delete'
  | 'report_view'
  | 'report_update'
  | 'report_action'
  | 'setting_view'
  | 'setting_update'
  | 'login'
  | 'logout';

export type TargetType = 'user' | 'job' | 'report' | 'setting' | 'system';

interface LogActionParams {
  adminId: string;
  action: AdminActionType;
  targetType: TargetType;
  targetId: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
}

interface AdminLogFilters {
  adminId?: string;
  action?: AdminActionType;
  targetType?: TargetType;
  targetId?: string;
  startDate?: Date;
  endDate?: Date;
}

interface PaginatedLogs {
  logs: Array<{
    id: string;
    adminId: string;
    adminEmail?: string;
    adminName?: string;
    action: string;
    targetType: string;
    targetId: string;
    details: unknown;
    ipAddress: string | null;
    createdAt: Date;
  }>;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Log an admin action
 */
export async function logAction(params: LogActionParams): Promise<void> {
  try {
    await prisma.adminLog.create({
      data: {
        adminId: params.adminId,
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId,
        details: (params.details || {}) as Prisma.InputJsonValue,
        ipAddress: params.ipAddress || null,
      },
    });

    logger.info('Admin action logged', {
      adminId: params.adminId,
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId,
    });
  } catch (error) {
    // Don't fail the operation if logging fails
    logger.error('Failed to log admin action', {
      error,
      params,
    });
  }
}

/**
 * Get admin logs with pagination and filters
 */
export async function getAdminLogs(
  filters: AdminLogFilters,
  page: number = 1,
  limit: number = 50
): Promise<PaginatedLogs> {
  const where: Record<string, unknown> = {};

  if (filters.adminId) {
    where.adminId = filters.adminId;
  }

  if (filters.action) {
    where.action = filters.action;
  }

  if (filters.targetType) {
    where.targetType = filters.targetType;
  }

  if (filters.targetId) {
    where.targetId = filters.targetId;
  }

  if (filters.startDate || filters.endDate) {
    where.createdAt = {};
    if (filters.startDate) {
      (where.createdAt as Record<string, Date>).gte = filters.startDate;
    }
    if (filters.endDate) {
      (where.createdAt as Record<string, Date>).lte = filters.endDate;
    }
  }

  const [logs, total] = await Promise.all([
    prisma.adminLog.findMany({
      where,
      include: {
        admin: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.adminLog.count({ where }),
  ]);

  return {
    logs: logs.map((log) => ({
      id: log.id,
      adminId: log.adminId,
      adminEmail: log.admin.email,
      adminName: `${log.admin.firstName} ${log.admin.lastName}`,
      action: log.action,
      targetType: log.targetType,
      targetId: log.targetId,
      details: log.details,
      ipAddress: log.ipAddress,
      createdAt: log.createdAt,
    })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Get logs for a specific target
 */
export async function getLogsForTarget(
  targetType: TargetType,
  targetId: string,
  limit: number = 20
): Promise<Array<{
  id: string;
  adminId: string;
  adminName: string;
  action: string;
  details: unknown;
  createdAt: Date;
}>> {
  const logs = await prisma.adminLog.findMany({
    where: {
      targetType,
      targetId,
    },
    include: {
      admin: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return logs.map((log) => ({
    id: log.id,
    adminId: log.adminId,
    adminName: `${log.admin.firstName} ${log.admin.lastName}`,
    action: log.action,
    details: log.details,
    createdAt: log.createdAt,
  }));
}

/**
 * Clean up old admin logs (older than specified days)
 */
export async function cleanupOldLogs(daysToKeep: number = 90): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

  const result = await prisma.adminLog.deleteMany({
    where: {
      createdAt: {
        lt: cutoffDate,
      },
    },
  });

  logger.info(`Cleaned up ${result.count} old admin logs`);
  return result.count;
}

export default {
  logAction,
  getAdminLogs,
  getLogsForTarget,
  cleanupOldLogs,
};
