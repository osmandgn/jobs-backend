import { prisma } from '../config/database';
import { tokenService } from './token.service';
import { emailService } from './email.service';
import * as adminLogService from './adminLog.service';
import { NotFoundError, ValidationError, ErrorCodes } from '../utils/AppError';
import logger from '../utils/logger';
import type { UserStatus, UserRole, JobStatus } from '@prisma/client';

// ============================================
// Dashboard Statistics
// ============================================

interface DashboardStats {
  users: {
    total: number;
    active: number;
    suspended: number;
    banned: number;
    newToday: number;
    newThisWeek: number;
    newThisMonth: number;
    jobSeekers: number;
    employers: number;
  };
  jobs: {
    total: number;
    active: number;
    pending: number;
    filled: number;
    completed: number;
    expired: number;
    newToday: number;
    newThisWeek: number;
  };
  applications: {
    total: number;
    pending: number;
    accepted: number;
    rejected: number;
  };
  reports: {
    total: number;
    pending: number;
    investigating: number;
  };
  reviews: {
    total: number;
    averageRating: number;
  };
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    userStats,
    jobStats,
    applicationStats,
    reportStats,
    reviewStats,
  ] = await Promise.all([
    // User stats
    prisma.$transaction([
      prisma.user.count(),
      prisma.user.count({ where: { status: 'active' } }),
      prisma.user.count({ where: { status: 'suspended' } }),
      prisma.user.count({ where: { status: 'banned' } }),
      prisma.user.count({ where: { createdAt: { gte: startOfToday } } }),
      prisma.user.count({ where: { createdAt: { gte: startOfWeek } } }),
      prisma.user.count({ where: { createdAt: { gte: startOfMonth } } }),
      prisma.user.count({ where: { isJobSeeker: true } }),
      prisma.user.count({ where: { isEmployer: true } }),
    ]),
    // Job stats
    prisma.$transaction([
      prisma.job.count(),
      prisma.job.count({ where: { status: 'active' } }),
      prisma.job.count({ where: { status: 'pending_review' } }),
      prisma.job.count({ where: { status: 'filled' } }),
      prisma.job.count({ where: { status: 'completed' } }),
      prisma.job.count({ where: { status: 'expired' } }),
      prisma.job.count({ where: { createdAt: { gte: startOfToday } } }),
      prisma.job.count({ where: { createdAt: { gte: startOfWeek } } }),
    ]),
    // Application stats
    prisma.$transaction([
      prisma.application.count(),
      prisma.application.count({ where: { status: 'pending' } }),
      prisma.application.count({ where: { status: 'accepted' } }),
      prisma.application.count({ where: { status: 'rejected' } }),
    ]),
    // Report stats
    prisma.$transaction([
      prisma.report.count(),
      prisma.report.count({ where: { status: 'pending' } }),
      prisma.report.count({ where: { status: 'investigating' } }),
    ]),
    // Review stats
    prisma.review.aggregate({
      _count: { id: true },
      _avg: { rating: true },
    }),
  ]);

  return {
    users: {
      total: userStats[0],
      active: userStats[1],
      suspended: userStats[2],
      banned: userStats[3],
      newToday: userStats[4],
      newThisWeek: userStats[5],
      newThisMonth: userStats[6],
      jobSeekers: userStats[7],
      employers: userStats[8],
    },
    jobs: {
      total: jobStats[0],
      active: jobStats[1],
      pending: jobStats[2],
      filled: jobStats[3],
      completed: jobStats[4],
      expired: jobStats[5],
      newToday: jobStats[6],
      newThisWeek: jobStats[7],
    },
    applications: {
      total: applicationStats[0],
      pending: applicationStats[1],
      accepted: applicationStats[2],
      rejected: applicationStats[3],
    },
    reports: {
      total: reportStats[0],
      pending: reportStats[1],
      investigating: reportStats[2],
    },
    reviews: {
      total: reviewStats._count.id,
      averageRating: reviewStats._avg.rating || 0,
    },
  };
}

interface RecentActivity {
  type: 'user_registered' | 'job_created' | 'application_received' | 'report_created';
  message: string;
  timestamp: Date;
  data: Record<string, unknown>;
}

export async function getRecentActivity(limit: number = 20): Promise<RecentActivity[]> {
  const [recentUsers, recentJobs, recentApplications, recentReports] = await Promise.all([
    prisma.user.findMany({
      select: { id: true, firstName: true, lastName: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.job.findMany({
      select: { id: true, title: true, createdAt: true, user: { select: { firstName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.application.findMany({
      select: {
        id: true,
        createdAt: true,
        job: { select: { title: true } },
        applicant: { select: { firstName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.report.findMany({
      select: { id: true, reason: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ]);

  const activities: RecentActivity[] = [];

  recentUsers.forEach((user) => {
    activities.push({
      type: 'user_registered',
      message: `${user.firstName} ${user.lastName} kayıt oldu`,
      timestamp: user.createdAt,
      data: { userId: user.id },
    });
  });

  recentJobs.forEach((job) => {
    activities.push({
      type: 'job_created',
      message: `${job.user.firstName} "${job.title}" iş ilanı oluşturdu`,
      timestamp: job.createdAt,
      data: { jobId: job.id },
    });
  });

  recentApplications.forEach((app) => {
    activities.push({
      type: 'application_received',
      message: `${app.applicant.firstName} "${app.job.title}" ilanına başvurdu`,
      timestamp: app.createdAt,
      data: { applicationId: app.id },
    });
  });

  recentReports.forEach((report) => {
    activities.push({
      type: 'report_created',
      message: `Yeni rapor: ${report.reason}`,
      timestamp: report.createdAt,
      data: { reportId: report.id },
    });
  });

  // Sort by timestamp and limit
  activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  return activities.slice(0, limit);
}

export async function getTopEmployers(limit: number = 5): Promise<Array<{
  id: string;
  name: string;
  email: string;
  profilePhotoUrl: string | null;
  jobsCount: number;
}>> {
  const employers = await prisma.user.findMany({
    where: {
      isEmployer: true,
      status: 'active',
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      profilePhotoUrl: true,
      _count: {
        select: {
          postedJobs: true,
        },
      },
    },
    orderBy: {
      postedJobs: {
        _count: 'desc',
      },
    },
    take: limit,
  });

  return employers.map((emp) => ({
    id: emp.id,
    name: `${emp.firstName} ${emp.lastName}`,
    email: emp.email,
    profilePhotoUrl: emp.profilePhotoUrl,
    jobsCount: emp._count.postedJobs,
  }));
}

export async function getChartData(days: number = 365): Promise<Array<{
  date: string;
  users: number;
  jobs: number;
  applications: number;
}>> {
  const now = new Date();
  const result: Array<{ date: string; users: number; jobs: number; applications: number }> = [];

  // Get monthly data for the last 12 months
  for (let i = 11; i >= 0; i--) {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
    const monthName = startOfMonth.toLocaleString('en-US', { month: 'short' });

    const [usersCount, jobsCount, applicationsCount] = await Promise.all([
      prisma.user.count({
        where: {
          createdAt: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
      }),
      prisma.job.count({
        where: {
          createdAt: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
      }),
      prisma.application.count({
        where: {
          createdAt: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
      }),
    ]);

    result.push({
      date: monthName,
      users: usersCount,
      jobs: jobsCount,
      applications: applicationsCount,
    });
  }

  return result;
}

// ============================================
// User Management
// ============================================

interface UserListFilters {
  search?: string;
  status?: string;
  role?: string;
  isJobSeeker?: boolean;
  isEmployer?: boolean;
}

interface UserListResult {
  users: Array<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    status: string;
    role: string;
    isJobSeeker: boolean;
    isEmployer: boolean;
    createdAt: Date;
    jobsCount: number;
    applicationsCount: number;
    reportsAbout: number;
  }>;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function getUsers(
  filters: UserListFilters,
  page: number = 1,
  limit: number = 20,
  sortBy: string = 'createdAt',
  sortOrder: 'asc' | 'desc' = 'desc'
): Promise<UserListResult> {
  const where: Record<string, unknown> = {};

  if (filters.search) {
    where.OR = [
      { email: { contains: filters.search, mode: 'insensitive' } },
      { firstName: { contains: filters.search, mode: 'insensitive' } },
      { lastName: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.role) {
    where.role = filters.role;
  }

  if (filters.isJobSeeker !== undefined) {
    where.isJobSeeker = filters.isJobSeeker;
  }

  if (filters.isEmployer !== undefined) {
    where.isEmployer = filters.isEmployer;
  }

  const orderBy: Record<string, string> = {};
  orderBy[sortBy] = sortOrder;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        status: true,
        role: true,
        isJobSeeker: true,
        isEmployer: true,
        createdAt: true,
        _count: {
          select: {
            postedJobs: true,
            applications: true,
            reportsAgainst: true,
          },
        },
      },
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  return {
    users: users.map((user) => ({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      status: user.status,
      role: user.role,
      isJobSeeker: user.isJobSeeker,
      isEmployer: user.isEmployer,
      createdAt: user.createdAt,
      jobsCount: user._count.postedJobs,
      applicationsCount: user._count.applications,
      reportsAbout: user._count.reportsAgainst,
    })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getUserById(userId: string): Promise<{
  user: Record<string, unknown>;
  stats: Record<string, unknown>;
  recentJobs: Array<Record<string, unknown>>;
  recentApplications: Array<Record<string, unknown>>;
  recentReviews: Array<Record<string, unknown>>;
  reportsAbout: Array<Record<string, unknown>>;
  adminLogs: Array<Record<string, unknown>>;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      skills: { include: { skill: true } },
      categories: { include: { category: true } },
      _count: {
        select: {
          postedJobs: true,
          applications: true,
          reviewsReceived: true,
          reportsAgainst: true,
        },
      },
    },
  });

  if (!user) {
    throw new NotFoundError('Kullanıcı bulunamadı', ErrorCodes.NOT_FOUND);
  }

  const [recentJobs, recentApplications, recentReviews, reportsAgainstUser, adminLogs] =
    await Promise.all([
      prisma.job.findMany({
        where: { userId },
        select: {
          id: true,
          title: true,
          status: true,
          createdAt: true,
          applicationsCount: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      prisma.application.findMany({
        where: { applicantId: userId },
        select: {
          id: true,
          status: true,
          createdAt: true,
          job: { select: { id: true, title: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      prisma.review.findMany({
        where: { revieweeId: userId },
        select: {
          id: true,
          rating: true,
          comment: true,
          createdAt: true,
          reviewer: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      prisma.report.findMany({
        where: { reportedUserId: userId },
        select: {
          id: true,
          reason: true,
          status: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      adminLogService.getLogsForTarget('user', userId, 10),
    ]);

  // Calculate average rating
  const reviewStats = await prisma.review.aggregate({
    where: { revieweeId: userId },
    _avg: { rating: true },
    _count: { id: true },
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      phoneVerified: user.phoneVerified,
      bio: user.bio,
      profilePhotoUrl: user.profilePhotoUrl,
      locationCity: user.locationCity,
      locationPostcode: user.locationPostcode,
      isJobSeeker: user.isJobSeeker,
      isEmployer: user.isEmployer,
      isActivelyLooking: user.isActivelyLooking,
      status: user.status,
      role: user.role,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      skills: user.skills.map((s) => s.skill),
      categories: user.categories.map((c) => c.category),
    },
    stats: {
      totalJobs: user._count.postedJobs,
      totalApplications: user._count.applications,
      totalReviews: user._count.reviewsReceived,
      averageRating: reviewStats._avg.rating || 0,
      reportsAgainst: user._count.reportsAgainst,
    },
    recentJobs,
    recentApplications,
    recentReviews,
    reportsAbout: reportsAgainstUser,
    adminLogs,
  };
}

export async function updateUser(
  adminId: string,
  userId: string,
  updates: { status?: UserStatus; role?: UserRole },
  ipAddress?: string
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw new NotFoundError('Kullanıcı bulunamadı', ErrorCodes.NOT_FOUND);
  }

  const updateData: { status?: UserStatus; role?: UserRole } = {};
  if (updates.status) updateData.status = updates.status;
  if (updates.role) updateData.role = updates.role;

  await prisma.user.update({
    where: { id: userId },
    data: updateData,
  });

  await adminLogService.logAction({
    adminId,
    action: 'user_update',
    targetType: 'user',
    targetId: userId,
    details: { updates, previousStatus: user.status, previousRole: user.role },
    ipAddress,
  });
}

export async function suspendUser(
  adminId: string,
  userId: string,
  reason: string,
  durationDays?: number,
  ipAddress?: string
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw new NotFoundError('Kullanıcı bulunamadı', ErrorCodes.NOT_FOUND);
  }

  if (user.status === 'suspended') {
    throw new ValidationError(
      'Kullanıcı zaten askıya alınmış',
      ErrorCodes.VALIDATION_FAILED
    );
  }

  if (user.role === 'admin') {
    throw new ValidationError(
      'Admin kullanıcılar askıya alınamaz',
      ErrorCodes.VALIDATION_FAILED
    );
  }

  await prisma.user.update({
    where: { id: userId },
    data: { status: 'suspended' },
  });

  // Revoke all tokens
  await tokenService.revokeAllUserTokens(userId);

  await adminLogService.logAction({
    adminId,
    action: 'user_suspend',
    targetType: 'user',
    targetId: userId,
    details: { reason, durationDays },
    ipAddress,
  });

  logger.info(`User ${userId} suspended by admin ${adminId}`, { reason, durationDays });
}

export async function banUser(
  adminId: string,
  userId: string,
  reason: string,
  ipAddress?: string
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw new NotFoundError('Kullanıcı bulunamadı', ErrorCodes.NOT_FOUND);
  }

  if (user.status === 'banned') {
    throw new ValidationError(
      'Kullanıcı zaten yasaklanmış',
      ErrorCodes.VALIDATION_FAILED
    );
  }

  if (user.role === 'admin') {
    throw new ValidationError(
      'Admin kullanıcılar yasaklanamaz',
      ErrorCodes.VALIDATION_FAILED
    );
  }

  await prisma.user.update({
    where: { id: userId },
    data: { status: 'banned' },
  });

  // Revoke all tokens
  await tokenService.revokeAllUserTokens(userId);

  await adminLogService.logAction({
    adminId,
    action: 'user_ban',
    targetType: 'user',
    targetId: userId,
    details: { reason },
    ipAddress,
  });

  logger.info(`User ${userId} banned by admin ${adminId}`, { reason });
}

export async function unsuspendUser(
  adminId: string,
  userId: string,
  ipAddress?: string
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw new NotFoundError('Kullanıcı bulunamadı', ErrorCodes.NOT_FOUND);
  }

  if (user.status !== 'suspended') {
    throw new ValidationError(
      'Kullanıcı askıya alınmış değil',
      ErrorCodes.VALIDATION_FAILED
    );
  }

  await prisma.user.update({
    where: { id: userId },
    data: { status: 'active' },
  });

  await adminLogService.logAction({
    adminId,
    action: 'user_unsuspend',
    targetType: 'user',
    targetId: userId,
    details: {},
    ipAddress,
  });

  logger.info(`User ${userId} unsuspended by admin ${adminId}`);
}

export async function deleteUser(
  adminId: string,
  userId: string,
  hardDelete: boolean = false,
  ipAddress?: string
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw new NotFoundError('Kullanıcı bulunamadı', ErrorCodes.NOT_FOUND);
  }

  if (user.role === 'admin') {
    throw new ValidationError(
      'Admin kullanıcılar silinemez',
      ErrorCodes.VALIDATION_FAILED
    );
  }

  if (hardDelete) {
    // Hard delete - permanently remove
    await prisma.user.delete({ where: { id: userId } });
  } else {
    // Soft delete - anonymize data
    await prisma.user.update({
      where: { id: userId },
      data: {
        status: 'deleted',
        email: `deleted_${userId}@deleted.local`,
        firstName: 'Deleted',
        lastName: 'User',
        phone: null,
        bio: null,
        profilePhotoUrl: null,
        locationCity: null,
        locationPostcode: null,
        locationLat: null,
        locationLng: null,
      },
    });
  }

  // Revoke all tokens
  await tokenService.revokeAllUserTokens(userId);

  await adminLogService.logAction({
    adminId,
    action: 'user_delete',
    targetType: 'user',
    targetId: userId,
    details: { hardDelete },
    ipAddress,
  });

  logger.info(`User ${userId} deleted by admin ${adminId}`, { hardDelete });
}

// ============================================
// Job Management
// ============================================

interface JobListFilters {
  search?: string;
  status?: string;
  categoryId?: string;
  userId?: string;
}

interface JobListResult {
  jobs: Array<{
    id: string;
    title: string;
    status: string;
    categoryName: string;
    locationCity: string | null;
    payAmount: string;
    payType: string;
    applicationsCount: number;
    viewsCount: number;
    createdAt: Date;
    employer: {
      id: string;
      name: string;
    };
    reportsAbout: number;
  }>;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function getJobs(
  filters: JobListFilters,
  page: number = 1,
  limit: number = 20,
  sortBy: string = 'createdAt',
  sortOrder: 'asc' | 'desc' = 'desc'
): Promise<JobListResult> {
  const where: Record<string, unknown> = {};

  if (filters.search) {
    where.title = { contains: filters.search, mode: 'insensitive' };
  }

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.categoryId) {
    where.categoryId = filters.categoryId;
  }

  if (filters.userId) {
    where.userId = filters.userId;
  }

  const orderBy: Record<string, string> = {};
  orderBy[sortBy] = sortOrder;

  const [jobs, total] = await Promise.all([
    prisma.job.findMany({
      where,
      include: {
        category: { select: { name: true } },
        user: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { reports: true } },
      },
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.job.count({ where }),
  ]);

  return {
    jobs: jobs.map((job) => ({
      id: job.id,
      title: job.title,
      status: job.status,
      categoryName: job.category.name,
      locationCity: job.locationCity,
      payAmount: job.payAmount.toString(),
      payType: job.payType,
      applicationsCount: job.applicationsCount,
      viewsCount: job.viewsCount,
      createdAt: job.createdAt,
      employer: {
        id: job.user.id,
        name: `${job.user.firstName} ${job.user.lastName}`,
      },
      reportsAbout: job._count.reports,
    })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getJobById(adminId: string, jobId: string): Promise<{
  job: Record<string, unknown>;
  employer: Record<string, unknown>;
  applications: Array<Record<string, unknown>>;
  reports: Array<Record<string, unknown>>;
  adminLogs: Array<Record<string, unknown>>;
}> {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: {
      category: true,
      images: true,
      requiredSkills: { include: { skill: true } },
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          profilePhotoUrl: true,
          status: true,
        },
      },
    },
  });

  if (!job) {
    throw new NotFoundError('İş ilanı bulunamadı', ErrorCodes.NOT_FOUND);
  }

  const [applications, reports, adminLogs] = await Promise.all([
    prisma.application.findMany({
      where: { jobId },
      select: {
        id: true,
        status: true,
        createdAt: true,
        applicant: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.report.findMany({
      where: { reportedJobId: jobId },
      select: {
        id: true,
        reason: true,
        status: true,
        createdAt: true,
        reporter: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    adminLogService.getLogsForTarget('job', jobId, 10),
  ]);

  // Log view
  await adminLogService.logAction({
    adminId,
    action: 'job_view',
    targetType: 'job',
    targetId: jobId,
    details: {},
  });

  return {
    job: {
      id: job.id,
      title: job.title,
      description: job.description,
      status: job.status,
      category: job.category,
      locationAddress: job.locationAddress,
      locationCity: job.locationCity,
      locationPostcode: job.locationPostcode,
      jobDate: job.jobDate,
      startTime: job.startTime,
      endTime: job.endTime,
      payAmount: job.payAmount.toString(),
      payType: job.payType,
      experienceLevel: job.experienceLevel,
      viewsCount: job.viewsCount,
      applicationsCount: job.applicationsCount,
      images: job.images,
      requiredSkills: job.requiredSkills.map((rs) => rs.skill),
      adminNotes: job.adminNotes,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      expiresAt: job.expiresAt,
    },
    employer: job.user,
    applications,
    reports,
    adminLogs,
  };
}

export async function updateJob(
  adminId: string,
  jobId: string,
  updates: { status?: JobStatus; adminNotes?: string },
  ipAddress?: string
): Promise<void> {
  const job = await prisma.job.findUnique({ where: { id: jobId } });

  if (!job) {
    throw new NotFoundError('İş ilanı bulunamadı', ErrorCodes.NOT_FOUND);
  }

  const updateData: { status?: JobStatus; adminNotes?: string } = {};
  if (updates.status) updateData.status = updates.status;
  if (updates.adminNotes) updateData.adminNotes = updates.adminNotes;

  await prisma.job.update({
    where: { id: jobId },
    data: updateData,
  });

  await adminLogService.logAction({
    adminId,
    action: 'job_update',
    targetType: 'job',
    targetId: jobId,
    details: { updates, previousStatus: job.status },
    ipAddress,
  });
}

export async function approveJob(
  adminId: string,
  jobId: string,
  ipAddress?: string
): Promise<void> {
  const job = await prisma.job.findUnique({ where: { id: jobId } });

  if (!job) {
    throw new NotFoundError('İş ilanı bulunamadı', ErrorCodes.NOT_FOUND);
  }

  if (job.status !== 'pending_review') {
    throw new ValidationError(
      'Sadece bekleyen ilanlar onaylanabilir',
      ErrorCodes.VALIDATION_FAILED
    );
  }

  await prisma.job.update({
    where: { id: jobId },
    data: { status: 'active' },
  });

  await adminLogService.logAction({
    adminId,
    action: 'job_approve',
    targetType: 'job',
    targetId: jobId,
    details: {},
    ipAddress,
  });

  logger.info(`Job ${jobId} approved by admin ${adminId}`);
}

export async function rejectJob(
  adminId: string,
  jobId: string,
  reason: string,
  ipAddress?: string
): Promise<void> {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: { user: { select: { email: true, firstName: true } } },
  });

  if (!job) {
    throw new NotFoundError('İş ilanı bulunamadı', ErrorCodes.NOT_FOUND);
  }

  if (job.status !== 'pending_review') {
    throw new ValidationError(
      'Sadece bekleyen ilanlar reddedilebilir',
      ErrorCodes.VALIDATION_FAILED
    );
  }

  await prisma.job.update({
    where: { id: jobId },
    data: {
      status: 'rejected',
      adminNotes: reason,
    },
  });

  await adminLogService.logAction({
    adminId,
    action: 'job_reject',
    targetType: 'job',
    targetId: jobId,
    details: { reason },
    ipAddress,
  });

  logger.info(`Job ${jobId} rejected by admin ${adminId}`, { reason });
}

export async function deleteJob(
  adminId: string,
  jobId: string,
  reason: string,
  ipAddress?: string
): Promise<void> {
  const job = await prisma.job.findUnique({ where: { id: jobId } });

  if (!job) {
    throw new NotFoundError('İş ilanı bulunamadı', ErrorCodes.NOT_FOUND);
  }

  // Soft delete by changing status
  await prisma.job.update({
    where: { id: jobId },
    data: {
      status: 'deleted' as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      adminNotes: reason,
    },
  });

  await adminLogService.logAction({
    adminId,
    action: 'job_delete',
    targetType: 'job',
    targetId: jobId,
    details: { reason },
    ipAddress,
  });

  logger.info(`Job ${jobId} deleted by admin ${adminId}`, { reason });
}

export async function bulkApproveJobs(
  adminId: string,
  jobIds: string[],
  ipAddress?: string
): Promise<{ approved: number; failed: number }> {
  let approved = 0;
  let failed = 0;

  for (const jobId of jobIds) {
    try {
      await approveJob(adminId, jobId, ipAddress);
      approved++;
    } catch {
      failed++;
    }
  }

  return { approved, failed };
}

// ============================================
// Application Management
// ============================================

interface ApplicationFilters {
  status?: string;
  search?: string;
}

export async function getApplications(
  filters: ApplicationFilters,
  page: number = 1,
  limit: number = 20,
  sortBy: string = 'createdAt',
  sortOrder: 'asc' | 'desc' = 'desc'
): Promise<{
  applications: Array<Record<string, unknown>>;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  const where: Record<string, unknown> = {};

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.search) {
    where.OR = [
      {
        applicant: {
          OR: [
            { firstName: { contains: filters.search, mode: 'insensitive' } },
            { lastName: { contains: filters.search, mode: 'insensitive' } },
            { email: { contains: filters.search, mode: 'insensitive' } },
          ],
        },
      },
      {
        job: {
          title: { contains: filters.search, mode: 'insensitive' },
        },
      },
    ];
  }

  const [applications, total] = await Promise.all([
    prisma.application.findMany({
      where,
      include: {
        applicant: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            profilePhotoUrl: true,
          },
        },
        job: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.application.count({ where }),
  ]);

  // Transform to include employer from job.user
  const transformedApplications = applications.map((app) => ({
    ...app,
    employer: app.job?.user,
  }));

  return {
    applications: transformedApplications,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getApplicationById(applicationId: string): Promise<Record<string, unknown> | null> {
  const app = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      applicant: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          profilePhotoUrl: true,
          phone: true,
          bio: true,
        },
      },
      job: {
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      },
    },
  });

  if (!app) return null;

  return {
    ...app,
    employer: app.job?.user,
  };
}

// ============================================
// Report Management
// ============================================

interface ReportFilters {
  status?: string;
  type?: 'user' | 'job';
  reason?: string;
}

export async function getReports(
  filters: ReportFilters,
  page: number = 1,
  limit: number = 20,
  sortBy: string = 'createdAt',
  sortOrder: 'asc' | 'desc' = 'desc'
): Promise<{
  reports: Array<Record<string, unknown>>;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  const where: Record<string, unknown> = {};

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.type === 'user') {
    where.reportedUserId = { not: null };
    where.reportedJobId = null;
  } else if (filters.type === 'job') {
    where.reportedJobId = { not: null };
    where.reportedUserId = null;
  }

  if (filters.reason) {
    where.reason = filters.reason;
  }

  const [reports, total] = await Promise.all([
    prisma.report.findMany({
      where,
      include: {
        reporter: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            profilePhotoUrl: true,
          },
        },
        reportedUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            profilePhotoUrl: true,
            status: true,
          },
        },
        reportedJob: {
          select: {
            id: true,
            title: true,
            status: true,
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        admin: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.report.count({ where }),
  ]);

  return {
    reports: reports.map((report) => ({
      id: report.id,
      reason: report.reason,
      description: report.description,
      evidenceUrls: report.evidenceUrls,
      status: report.status,
      adminNotes: report.adminNotes,
      resolvedAt: report.resolvedAt,
      createdAt: report.createdAt,
      reporter: report.reporter,
      reportedUser: report.reportedUser,
      reportedJob: report.reportedJob,
      admin: report.admin,
      type: report.reportedUserId ? 'user' : 'job',
    })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getReportById(
  adminId: string,
  reportId: string
): Promise<Record<string, unknown>> {
  const report = await prisma.report.findUnique({
    where: { id: reportId },
    include: {
      reporter: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          profilePhotoUrl: true,
          createdAt: true,
        },
      },
      reportedUser: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          profilePhotoUrl: true,
          status: true,
          createdAt: true,
          _count: {
            select: {
              reportsAgainst: true,
            },
          },
        },
      },
      reportedJob: {
        select: {
          id: true,
          title: true,
          description: true,
          status: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          _count: {
            select: {
              reports: true,
            },
          },
        },
      },
      admin: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  if (!report) {
    throw new NotFoundError('Rapor bulunamadı', ErrorCodes.NOT_FOUND);
  }

  // Mark as investigating if pending
  if (report.status === 'pending') {
    await prisma.report.update({
      where: { id: reportId },
      data: {
        status: 'investigating',
        adminId,
      },
    });

    await adminLogService.logAction({
      adminId,
      action: 'report_view',
      targetType: 'report',
      targetId: reportId,
      details: { previousStatus: 'pending' },
    });
  }

  // Get previous reports for context
  const previousReports = await prisma.report.findMany({
    where: {
      OR: [
        report.reportedUserId ? { reportedUserId: report.reportedUserId } : {},
        report.reportedJobId ? { reportedJobId: report.reportedJobId } : {},
      ].filter((o) => Object.keys(o).length > 0),
      id: { not: reportId },
    },
    select: {
      id: true,
      reason: true,
      status: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  return {
    id: report.id,
    reason: report.reason,
    description: report.description,
    evidenceUrls: report.evidenceUrls,
    status: report.status,
    adminNotes: report.adminNotes,
    resolvedAt: report.resolvedAt,
    createdAt: report.createdAt,
    reporter: report.reporter,
    reportedUser: report.reportedUser,
    reportedJob: report.reportedJob,
    admin: report.admin,
    type: report.reportedUserId ? 'user' : 'job',
    previousReports,
  };
}

export async function updateReport(
  adminId: string,
  reportId: string,
  updates: { status?: string; adminNotes?: string },
  ipAddress?: string
): Promise<void> {
  const report = await prisma.report.findUnique({ where: { id: reportId } });

  if (!report) {
    throw new NotFoundError('Rapor bulunamadı', ErrorCodes.NOT_FOUND);
  }

  const updateData: Record<string, unknown> = {
    adminId,
  };

  if (updates.status) {
    updateData.status = updates.status;
    if (updates.status === 'resolved' || updates.status === 'dismissed') {
      updateData.resolvedAt = new Date();
    }
  }

  if (updates.adminNotes !== undefined) {
    updateData.adminNotes = updates.adminNotes;
  }

  await prisma.report.update({
    where: { id: reportId },
    data: updateData,
  });

  await adminLogService.logAction({
    adminId,
    action: 'report_update',
    targetType: 'report',
    targetId: reportId,
    details: { updates, previousStatus: report.status },
    ipAddress,
  });
}

export type ReportAction = 'warn' | 'suspend' | 'ban' | 'remove_job' | 'dismiss';

export async function takeReportAction(
  adminId: string,
  reportId: string,
  action: ReportAction,
  reason?: string,
  ipAddress?: string
): Promise<void> {
  const report = await prisma.report.findUnique({
    where: { id: reportId },
    include: {
      reportedUser: true,
      reportedJob: true,
    },
  });

  if (!report) {
    throw new NotFoundError('Rapor bulunamadı', ErrorCodes.NOT_FOUND);
  }

  switch (action) {
    case 'warn':
      if (!report.reportedUserId) {
        throw new ValidationError('Uyarı sadece kullanıcı raporları için geçerli', ErrorCodes.VALIDATION_FAILED);
      }
      // Send warning email (would integrate with email service)
      logger.info(`Warning sent to user ${report.reportedUserId}`, { reason });
      break;

    case 'suspend':
      if (!report.reportedUserId) {
        throw new ValidationError('Askıya alma sadece kullanıcı raporları için geçerli', ErrorCodes.VALIDATION_FAILED);
      }
      await suspendUser(adminId, report.reportedUserId, reason || 'Rapor nedeniyle askıya alındı', undefined, ipAddress);
      break;

    case 'ban':
      if (!report.reportedUserId) {
        throw new ValidationError('Yasaklama sadece kullanıcı raporları için geçerli', ErrorCodes.VALIDATION_FAILED);
      }
      await banUser(adminId, report.reportedUserId, reason || 'Rapor nedeniyle yasaklandı', ipAddress);
      break;

    case 'remove_job':
      if (!report.reportedJobId) {
        throw new ValidationError('İlan kaldırma sadece iş ilanı raporları için geçerli', ErrorCodes.VALIDATION_FAILED);
      }
      await deleteJob(adminId, report.reportedJobId, reason || 'Rapor nedeniyle kaldırıldı', ipAddress);
      break;

    case 'dismiss':
      // Just dismiss the report, no action on user/job
      break;

    default:
      throw new ValidationError('Geçersiz aksiyon', ErrorCodes.VALIDATION_FAILED);
  }

  // Update report status
  await prisma.report.update({
    where: { id: reportId },
    data: {
      status: action === 'dismiss' ? 'dismissed' : 'resolved',
      resolvedAt: new Date(),
      adminId,
      adminNotes: report.adminNotes
        ? `${report.adminNotes}\n\nAksiyon: ${action}${reason ? ` - ${reason}` : ''}`
        : `Aksiyon: ${action}${reason ? ` - ${reason}` : ''}`,
    },
  });

  await adminLogService.logAction({
    adminId,
    action: 'report_action',
    targetType: 'report',
    targetId: reportId,
    details: { action, reason, reportedUserId: report.reportedUserId, reportedJobId: report.reportedJobId },
    ipAddress,
  });

  logger.info(`Report ${reportId} action taken: ${action}`, { adminId, reason });
}

export async function bulkResolveReports(
  adminId: string,
  reportIds: string[],
  status: 'resolved' | 'dismissed',
  ipAddress?: string
): Promise<{ resolved: number; failed: number }> {
  let resolved = 0;
  let failed = 0;

  for (const reportId of reportIds) {
    try {
      await updateReport(adminId, reportId, { status }, ipAddress);
      resolved++;
    } catch (error) {
      failed++;
      logger.warn(`Failed to resolve report ${reportId}`, { error });
    }
  }

  return { resolved, failed };
}

export default {
  getDashboardStats,
  getRecentActivity,
  getUsers,
  getUserById,
  updateUser,
  suspendUser,
  banUser,
  unsuspendUser,
  deleteUser,
  getJobs,
  getJobById,
  updateJob,
  approveJob,
  rejectJob,
  deleteJob,
  bulkApproveJobs,
  getReports,
  getReportById,
  updateReport,
  takeReportAction,
  bulkResolveReports,
};
