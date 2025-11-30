import { prisma } from '../config/database';
import { ApplicationStatus, Prisma } from '@prisma/client';
import {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
  ErrorCodes,
} from '../utils/AppError';
import { cacheService } from './cache.service';
import { cacheKeys } from '../utils/cacheKeys';
import logger from '../utils/logger';
import type {
  ApplyToJobInput,
  GetApplicationsQuery,
} from '../validators/application.validator';

export interface ApplicationListItem {
  id: string;
  message: string;
  status: ApplicationStatus;
  employerRead: boolean;
  createdAt: Date;
  updatedAt: Date;
  job: {
    id: string;
    title: string;
    locationCity: string | null;
    locationPostcode: string;
    jobDate: Date;
    startTime: string;
    payAmount: number;
    payType: string;
    status: string;
  };
  employer?: {
    id: string;
    firstName: string;
    lastName: string;
    profilePhotoUrl: string | null;
  };
  applicant?: {
    id: string;
    firstName: string;
    lastName: string;
    profilePhotoUrl: string | null;
    bio: string | null;
  };
  conversationId?: string;
}

export interface ApplicationDetail extends ApplicationListItem {
  job: ApplicationListItem['job'] & {
    description: string;
    category: {
      id: string;
      name: string;
      slug: string;
    };
  };
}

class ApplicationService {
  /**
   * Apply to a job
   */
  async applyToJob(
    jobId: string,
    applicantId: string,
    data: ApplyToJobInput
  ): Promise<ApplicationDetail> {
    // Get job with employer info
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, profilePhotoUrl: true } },
        category: { select: { id: true, name: true, slug: true } },
      },
    });

    if (!job) {
      throw new NotFoundError('İş ilanı bulunamadı', ErrorCodes.JOB_NOT_FOUND);
    }

    // Check job status
    if (job.status !== 'active') {
      throw new BadRequestError('Bu iş ilanı aktif değil', ErrorCodes.JOB_NOT_ACTIVE);
    }

    // Check job date not passed
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (job.jobDate < today) {
      throw new BadRequestError('Bu iş ilanının tarihi geçmiş', ErrorCodes.JOB_EXPIRED);
    }

    // Check not own job
    if (job.userId === applicantId) {
      throw new BadRequestError(
        'Kendi iş ilanınıza başvuramazsınız',
        ErrorCodes.JOB_CANNOT_APPLY_OWN
      );
    }

    // Check not already applied
    const existingApplication = await prisma.application.findUnique({
      where: {
        jobId_applicantId: { jobId, applicantId },
      },
    });

    if (existingApplication) {
      throw new ConflictError('Bu ilana zaten başvurdunuz', ErrorCodes.JOB_ALREADY_APPLIED);
    }

    // Check not blocked by employer
    const isBlocked = await prisma.blockedUser.findFirst({
      where: {
        OR: [
          { blockerId: job.userId, blockedId: applicantId },
          { blockerId: applicantId, blockedId: job.userId },
        ],
      },
    });

    if (isBlocked) {
      throw new ForbiddenError('Bu işverene başvuru yapamazsınız', ErrorCodes.USER_BLOCKED);
    }

    // Create application and conversation in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create application
      const application = await tx.application.create({
        data: {
          jobId,
          applicantId,
          message: data.message,
          status: 'pending',
        },
        include: {
          job: {
            include: {
              user: { select: { id: true, firstName: true, lastName: true, profilePhotoUrl: true } },
              category: { select: { id: true, name: true, slug: true } },
            },
          },
          applicant: {
            select: { id: true, firstName: true, lastName: true, profilePhotoUrl: true, bio: true },
          },
        },
      });

      // Create conversation for messaging
      const conversation = await tx.conversation.create({
        data: {
          jobId,
          employerId: job.userId,
          applicantId,
        },
      });

      // Increment applications count on job
      await tx.job.update({
        where: { id: jobId },
        data: { applicationsCount: { increment: 1 } },
      });

      return { application, conversation };
    });

    // Invalidate job cache
    await cacheService.del(cacheKeys.jobDetail(jobId));

    logger.info(`Application created: ${result.application.id} for job: ${jobId}`);

    // TODO: Trigger notification to employer

    return this.formatApplicationDetail(result.application, result.conversation.id);
  }

  /**
   * Get my applications (as job seeker)
   */
  async getMyApplications(
    userId: string,
    query: GetApplicationsQuery
  ): Promise<{ applications: ApplicationListItem[]; total: number; page: number; totalPages: number }> {
    const { status, page, limit } = query;

    const where: Prisma.ApplicationWhereInput = {
      applicantId: userId,
      ...(status && { status }),
    };

    const [applications, total] = await Promise.all([
      prisma.application.findMany({
        where,
        include: {
          job: {
            include: {
              user: { select: { id: true, firstName: true, lastName: true, profilePhotoUrl: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.application.count({ where }),
    ]);

    // Get conversation IDs for these applications
    const conversationMap = new Map<string, string>();
    if (applications.length > 0) {
      const conversations = await prisma.conversation.findMany({
        where: {
          jobId: { in: applications.map((a) => a.jobId) },
          applicantId: userId,
        },
        select: { id: true, jobId: true },
      });
      conversations.forEach((c) => conversationMap.set(c.jobId, c.id));
    }

    const applicationList: ApplicationListItem[] = applications.map((app) => ({
      id: app.id,
      message: app.message,
      status: app.status,
      employerRead: app.employerRead,
      createdAt: app.createdAt,
      updatedAt: app.updatedAt,
      job: {
        id: app.job.id,
        title: app.job.title,
        locationCity: app.job.locationCity,
        locationPostcode: app.job.locationPostcode,
        jobDate: app.job.jobDate,
        startTime: app.job.startTime,
        payAmount: Number(app.job.payAmount),
        payType: app.job.payType,
        status: app.job.status,
      },
      employer: app.job.user,
      conversationId: conversationMap.get(app.jobId),
    }));

    return {
      applications: applicationList,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get job applications (as employer)
   */
  async getJobApplications(
    jobId: string,
    userId: string,
    query: GetApplicationsQuery
  ): Promise<{ applications: ApplicationListItem[]; total: number; page: number; totalPages: number }> {
    // Verify job ownership
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      select: { userId: true },
    });

    if (!job) {
      throw new NotFoundError('İş ilanı bulunamadı', ErrorCodes.JOB_NOT_FOUND);
    }

    if (job.userId !== userId) {
      throw new ForbiddenError(
        'Bu iş ilanının başvurularını görüntüleme yetkiniz yok',
        ErrorCodes.FORBIDDEN
      );
    }

    const { status, page, limit } = query;

    const where: Prisma.ApplicationWhereInput = {
      jobId,
      ...(status && { status }),
    };

    const [applications, total] = await Promise.all([
      prisma.application.findMany({
        where,
        include: {
          applicant: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profilePhotoUrl: true,
              bio: true,
            },
          },
          job: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.application.count({ where }),
    ]);

    // Get conversation IDs
    const conversationMap = new Map<string, string>();
    if (applications.length > 0) {
      const conversations = await prisma.conversation.findMany({
        where: {
          jobId,
          applicantId: { in: applications.map((a) => a.applicantId) },
        },
        select: { id: true, applicantId: true },
      });
      conversations.forEach((c) => conversationMap.set(c.applicantId, c.id));
    }

    // Get applicant ratings
    const applicantIds = applications.map((a) => a.applicantId);
    const ratings = await this.getApplicantRatings(applicantIds);

    const applicationList: ApplicationListItem[] = applications.map((app) => ({
      id: app.id,
      message: app.message,
      status: app.status,
      employerRead: app.employerRead,
      createdAt: app.createdAt,
      updatedAt: app.updatedAt,
      job: {
        id: app.job.id,
        title: app.job.title,
        locationCity: app.job.locationCity,
        locationPostcode: app.job.locationPostcode,
        jobDate: app.job.jobDate,
        startTime: app.job.startTime,
        payAmount: Number(app.job.payAmount),
        payType: app.job.payType,
        status: app.job.status,
      },
      applicant: {
        ...app.applicant,
        averageRating: ratings.get(app.applicantId)?.avg || null,
        totalReviews: ratings.get(app.applicantId)?.count || 0,
      } as ApplicationListItem['applicant'] & { averageRating: number | null; totalReviews: number },
      conversationId: conversationMap.get(app.applicantId),
    }));

    return {
      applications: applicationList,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get single application
   */
  async getApplicationById(applicationId: string, userId: string): Promise<ApplicationDetail> {
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        job: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, profilePhotoUrl: true } },
            category: { select: { id: true, name: true, slug: true } },
          },
        },
        applicant: {
          select: { id: true, firstName: true, lastName: true, profilePhotoUrl: true, bio: true },
        },
      },
    });

    if (!application) {
      throw new NotFoundError('Başvuru bulunamadı', ErrorCodes.APPLICATION_NOT_FOUND);
    }

    // Check access
    const isApplicant = application.applicantId === userId;
    const isEmployer = application.job.userId === userId;

    if (!isApplicant && !isEmployer) {
      throw new ForbiddenError('Bu başvuruyu görüntüleme yetkiniz yok', ErrorCodes.FORBIDDEN);
    }

    // Mark as read if employer viewing
    if (isEmployer && !application.employerRead) {
      await prisma.application.update({
        where: { id: applicationId },
        data: { employerRead: true },
      });
    }

    // Get conversation ID
    const conversation = await prisma.conversation.findFirst({
      where: {
        jobId: application.jobId,
        applicantId: application.applicantId,
      },
      select: { id: true },
    });

    return this.formatApplicationDetail(application, conversation?.id);
  }

  /**
   * Update application status (employer)
   */
  async updateApplicationStatus(
    applicationId: string,
    userId: string,
    status: 'accepted' | 'rejected'
  ): Promise<ApplicationDetail> {
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        job: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, profilePhotoUrl: true } },
            category: { select: { id: true, name: true, slug: true } },
          },
        },
        applicant: {
          select: { id: true, firstName: true, lastName: true, profilePhotoUrl: true, bio: true },
        },
      },
    });

    if (!application) {
      throw new NotFoundError('Başvuru bulunamadı', ErrorCodes.APPLICATION_NOT_FOUND);
    }

    // Check job ownership
    if (application.job.userId !== userId) {
      throw new ForbiddenError(
        'Bu başvurunun durumunu değiştirme yetkiniz yok',
        ErrorCodes.FORBIDDEN
      );
    }

    // Check current status is pending
    if (application.status !== 'pending') {
      throw new BadRequestError(
        'Sadece bekleyen başvuruların durumu değiştirilebilir',
        ErrorCodes.APPLICATION_NOT_PENDING
      );
    }

    // Update application in transaction
    const result = await prisma.$transaction(async (tx) => {
      const updatedApplication = await tx.application.update({
        where: { id: applicationId },
        data: {
          status,
          employerRead: true,
        },
        include: {
          job: {
            include: {
              user: { select: { id: true, firstName: true, lastName: true, profilePhotoUrl: true } },
              category: { select: { id: true, name: true, slug: true } },
            },
          },
          applicant: {
            select: { id: true, firstName: true, lastName: true, profilePhotoUrl: true, bio: true },
          },
        },
      });

      // If accepted, optionally mark job as filled and reject other pending applications
      if (status === 'accepted') {
        // Update job status to filled
        await tx.job.update({
          where: { id: application.jobId },
          data: { status: 'filled' },
        });

        // Reject other pending applications
        await tx.application.updateMany({
          where: {
            jobId: application.jobId,
            id: { not: applicationId },
            status: 'pending',
          },
          data: { status: 'rejected' },
        });

        // Invalidate job cache
        await cacheService.del(cacheKeys.jobDetail(application.jobId));
      }

      return updatedApplication;
    });

    logger.info(
      `Application ${applicationId} status updated to ${status} by employer ${userId}`
    );

    // TODO: Trigger notification to applicant

    const conversation = await prisma.conversation.findFirst({
      where: {
        jobId: result.jobId,
        applicantId: result.applicantId,
      },
      select: { id: true },
    });

    return this.formatApplicationDetail(result, conversation?.id);
  }

  /**
   * Withdraw application (applicant)
   */
  async withdrawApplication(applicationId: string, userId: string): Promise<void> {
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      select: {
        id: true,
        applicantId: true,
        status: true,
        jobId: true,
      },
    });

    if (!application) {
      throw new NotFoundError('Başvuru bulunamadı', ErrorCodes.APPLICATION_NOT_FOUND);
    }

    // Check ownership
    if (application.applicantId !== userId) {
      throw new ForbiddenError('Bu başvuruyu geri çekme yetkiniz yok', ErrorCodes.FORBIDDEN);
    }

    // Check status is pending
    if (application.status !== 'pending') {
      throw new BadRequestError(
        'Sadece bekleyen başvurular geri çekilebilir',
        ErrorCodes.APPLICATION_NOT_PENDING
      );
    }

    // Update application and decrement count
    await prisma.$transaction(async (tx) => {
      await tx.application.update({
        where: { id: applicationId },
        data: { status: 'withdrawn' },
      });

      await tx.job.update({
        where: { id: application.jobId },
        data: { applicationsCount: { decrement: 1 } },
      });
    });

    // Invalidate job cache
    await cacheService.del(cacheKeys.jobDetail(application.jobId));

    logger.info(`Application ${applicationId} withdrawn by user ${userId}`);
  }

  // ==================== Private Helpers ====================

  private async getApplicantRatings(
    userIds: string[]
  ): Promise<Map<string, { avg: number; count: number }>> {
    if (userIds.length === 0) return new Map();

    const ratings = await prisma.review.groupBy({
      by: ['revieweeId'],
      where: {
        revieweeId: { in: userIds },
        reviewType: 'employer_to_worker',
      },
      _avg: { rating: true },
      _count: { rating: true },
    });

    const map = new Map<string, { avg: number; count: number }>();
    ratings.forEach((r) => {
      map.set(r.revieweeId, {
        avg: r._avg.rating || 0,
        count: r._count.rating,
      });
    });

    return map;
  }

  private formatApplicationDetail(
    application: {
      id: string;
      message: string;
      status: ApplicationStatus;
      employerRead: boolean;
      createdAt: Date;
      updatedAt: Date;
      job: {
        id: string;
        title: string;
        description: string;
        locationCity: string | null;
        locationPostcode: string;
        jobDate: Date;
        startTime: string;
        payAmount: Prisma.Decimal;
        payType: string;
        status: string;
        user: { id: string; firstName: string; lastName: string; profilePhotoUrl: string | null };
        category: { id: string; name: string; slug: string };
      };
      applicant: {
        id: string;
        firstName: string;
        lastName: string;
        profilePhotoUrl: string | null;
        bio: string | null;
      };
    },
    conversationId?: string
  ): ApplicationDetail {
    return {
      id: application.id,
      message: application.message,
      status: application.status,
      employerRead: application.employerRead,
      createdAt: application.createdAt,
      updatedAt: application.updatedAt,
      job: {
        id: application.job.id,
        title: application.job.title,
        description: application.job.description,
        locationCity: application.job.locationCity,
        locationPostcode: application.job.locationPostcode,
        jobDate: application.job.jobDate,
        startTime: application.job.startTime,
        payAmount: Number(application.job.payAmount),
        payType: application.job.payType,
        status: application.job.status,
        category: application.job.category,
      },
      employer: application.job.user,
      applicant: application.applicant,
      conversationId,
    };
  }
}

export const applicationService = new ApplicationService();
export default applicationService;
