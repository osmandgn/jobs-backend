import { prisma } from '../config/database';
import { Prisma, ReportStatus, ReportReason } from '@prisma/client';
import {
  NotFoundError,
  BadRequestError,
  ErrorCodes,
} from '../utils/AppError';
import logger from '../utils/logger';
import type { CreateReportInput, GetReportsQuery } from '../validators/report.validator';

export interface ReportItem {
  id: string;
  type: 'user' | 'job';
  targetId: string;
  targetInfo: {
    name?: string;
    title?: string;
  };
  reason: ReportReason;
  description: string | null;
  evidenceUrls: string[];
  status: ReportStatus;
  createdAt: Date;
}

class ReportService {
  /**
   * Create a report for a user or job
   */
  async createReport(
    reporterId: string,
    input: CreateReportInput
  ): Promise<{ id: string }> {
    const { type, targetId, reason, description, evidenceUrls } = input;

    // Can't report yourself
    if (type === 'user' && targetId === reporterId) {
      throw new BadRequestError(
        'Kendinizi raporlayamazsınız',
        ErrorCodes.BAD_REQUEST
      );
    }

    // Check if target exists
    if (type === 'user') {
      const user = await prisma.user.findUnique({
        where: { id: targetId },
        select: { id: true, status: true },
      });

      if (!user || user.status === 'deleted') {
        throw new NotFoundError('Kullanıcı bulunamadı', ErrorCodes.USER_NOT_FOUND);
      }
    } else {
      const job = await prisma.job.findUnique({
        where: { id: targetId },
        select: { id: true, status: true },
      });

      if (!job) {
        throw new NotFoundError('İş ilanı bulunamadı', ErrorCodes.JOB_NOT_FOUND);
      }
    }

    // Check for duplicate report within 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const existingReport = await prisma.report.findFirst({
      where: {
        reporterId,
        ...(type === 'user'
          ? { reportedUserId: targetId }
          : { reportedJobId: targetId }),
        createdAt: { gte: twentyFourHoursAgo },
      },
    });

    if (existingReport) {
      throw new BadRequestError(
        'Bu hedefi son 24 saat içinde zaten raporladınız',
        ErrorCodes.REPORT_DUPLICATE
      );
    }

    // Create report
    const report = await prisma.report.create({
      data: {
        reporterId,
        ...(type === 'user'
          ? { reportedUserId: targetId }
          : { reportedJobId: targetId }),
        reason: reason as ReportReason,
        description,
        evidenceUrls: evidenceUrls || [],
        status: 'pending',
      },
    });

    logger.info(`User ${reporterId} reported ${type} ${targetId}`, {
      reportId: report.id,
      reason,
    });

    return { id: report.id };
  }

  /**
   * Get reports submitted by current user
   */
  async getMyReports(
    userId: string,
    query: GetReportsQuery
  ): Promise<{
    reports: ReportItem[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const { page, limit, status } = query;

    const where: Prisma.ReportWhereInput = {
      reporterId: userId,
      ...(status && { status }),
    };

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where,
        include: {
          reportedUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          reportedJob: {
            select: {
              id: true,
              title: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.report.count({ where }),
    ]);

    return {
      reports: reports.map((r) => ({
        id: r.id,
        type: r.reportedUserId ? 'user' : 'job',
        targetId: r.reportedUserId || r.reportedJobId!,
        targetInfo: {
          ...(r.reportedUser && {
            name: `${r.reportedUser.firstName} ${r.reportedUser.lastName}`,
          }),
          ...(r.reportedJob && { title: r.reportedJob.title }),
        },
        reason: r.reason,
        description: r.description,
        evidenceUrls: r.evidenceUrls as string[],
        status: r.status,
        createdAt: r.createdAt,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get a single report by ID (only own reports)
   */
  async getReportById(
    userId: string,
    reportId: string
  ): Promise<ReportItem | null> {
    const report = await prisma.report.findFirst({
      where: {
        id: reportId,
        reporterId: userId,
      },
      include: {
        reportedUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        reportedJob: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    if (!report) {
      return null;
    }

    return {
      id: report.id,
      type: report.reportedUserId ? 'user' : 'job',
      targetId: report.reportedUserId || report.reportedJobId!,
      targetInfo: {
        ...(report.reportedUser && {
          name: `${report.reportedUser.firstName} ${report.reportedUser.lastName}`,
        }),
        ...(report.reportedJob && { title: report.reportedJob.title }),
      },
      reason: report.reason,
      description: report.description,
      evidenceUrls: report.evidenceUrls as string[],
      status: report.status,
      createdAt: report.createdAt,
    };
  }

  /**
   * Get total pending reports count (for admin)
   */
  async getPendingReportsCount(): Promise<number> {
    return prisma.report.count({
      where: { status: 'pending' },
    });
  }
}

export const reportService = new ReportService();
export default reportService;
