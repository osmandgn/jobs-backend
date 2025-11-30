import { prisma } from '../config/database';
import { JobStatus, PayType, ExperienceLevel, Prisma } from '@prisma/client';
import { AppError, BadRequestError, NotFoundError, ForbiddenError, ErrorCodes } from '../utils/AppError';
import { cacheService } from './cache.service';
import { cacheKeys } from '../utils/cacheKeys';
import { CACHE_TTL } from '../utils/cacheTTL';
import logger from '../utils/logger';
import type { CreateJobInput, UpdateJobInput, GetMyJobsQuery, JobSearchQuery, NearbyJobsQuery } from '../validators/job.validator';
import { calculateDistance, getBoundingBox } from '../utils/distance';
import { locationService } from './location.service';

// Editable job statuses
const EDITABLE_STATUSES: JobStatus[] = ['draft', 'active', 'paused', 'pending_review'];

// Status transitions allowed by job owner
const OWNER_STATUS_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  draft: ['active', 'pending_review'],
  pending_review: [],
  active: ['paused', 'filled', 'expired'],
  paused: ['active', 'expired'],
  filled: ['completed'],
  completed: [],
  expired: [],
  rejected: ['draft'],
};

export interface JobDetailResponse {
  id: string;
  title: string;
  description: string;
  categoryId: string;
  category: {
    id: string;
    name: string;
    slug: string;
    icon: string | null;
  };
  locationAddress: string | null;
  locationPostcode: string;
  locationCity: string | null;
  locationLat: number;
  locationLng: number;
  jobDate: Date;
  startTime: string;
  endTime: string | null;
  payAmount: number;
  payType: PayType;
  experienceLevel: ExperienceLevel | null;
  status: JobStatus;
  viewsCount: number;
  applicationsCount: number;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  employer: {
    id: string;
    firstName: string;
    lastName: string;
    profilePhotoUrl: string | null;
    averageRating: number | null;
    totalReviews: number;
  };
  images: Array<{
    id: string;
    imageUrl: string;
    sortOrder: number;
  }>;
  requiredSkills: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
  isSaved?: boolean;
  distance?: number;
  isOwner?: boolean;
  hasApplied?: boolean;
  applicationStatus?: string;
  applicationId?: string;
}

export interface JobListItem {
  id: string;
  title: string;
  locationCity: string | null;
  locationPostcode: string;
  locationLat: number;
  locationLng: number;
  jobDate: Date;
  startTime: string;
  payAmount: number;
  payType: PayType;
  status: JobStatus;
  applicationsCount: number;
  createdAt: Date;
  category: {
    id: string;
    name: string;
    slug: string;
  };
  employer: {
    id: string;
    firstName: string;
    lastName: string;
    profilePhotoUrl: string | null;
  };
  distance?: number;
}

export interface JobSearchResult {
  jobs: JobListItem[];
  total: number;
  page: number;
  totalPages: number;
  appliedFilters: Record<string, unknown>;
}

class JobService {
  /**
   * Create a new job
   */
  async createJob(userId: string, data: CreateJobInput): Promise<JobDetailResponse> {
    // Validate category exists
    const category = await prisma.category.findUnique({
      where: { id: data.categoryId },
    });

    if (!category || !category.isActive) {
      throw new BadRequestError('Geçersiz kategori', ErrorCodes.BAD_REQUEST);
    }

    // Validate skills if provided
    if (data.requiredSkillIds && data.requiredSkillIds.length > 0) {
      const skills = await prisma.skill.findMany({
        where: { id: { in: data.requiredSkillIds } },
      });

      if (skills.length !== data.requiredSkillIds.length) {
        throw new BadRequestError('Bazı beceriler bulunamadı', ErrorCodes.BAD_REQUEST);
      }
    }

    // Geocode postcode
    const coords = await this.geocodePostcode(data.locationPostcode);
    if (!coords) {
      throw new BadRequestError('Geçersiz posta kodu', ErrorCodes.VALIDATION_INVALID_POSTCODE);
    }

    // Get system settings
    const requiresApproval = await this.getSystemSetting('job_requires_approval', 'false');
    const expiryDays = await this.getSystemSetting('job_expiry_days', '7');

    // Calculate expiry date
    const jobDate = new Date(data.jobDate);
    const expiresAt = new Date(jobDate);
    expiresAt.setDate(expiresAt.getDate() + parseInt(expiryDays, 10));

    // Determine initial status
    const initialStatus: JobStatus = requiresApproval === 'true' ? 'pending_review' : 'active';

    // Create job with transaction
    const job = await prisma.$transaction(async (tx) => {
      const createdJob = await tx.job.create({
        data: {
          userId,
          categoryId: data.categoryId,
          title: data.title,
          description: data.description,
          locationAddress: data.locationAddress,
          locationPostcode: data.locationPostcode.toUpperCase().replace(/\s+/g, ' ').trim(),
          locationCity: data.locationCity,
          locationLat: coords.lat,
          locationLng: coords.lng,
          jobDate: jobDate,
          startTime: data.startTime,
          endTime: data.endTime,
          payAmount: data.payAmount,
          payType: data.payType as PayType,
          experienceLevel: data.experienceLevel as ExperienceLevel | undefined,
          status: initialStatus,
          expiresAt,
        },
      });

      // Add required skills
      if (data.requiredSkillIds && data.requiredSkillIds.length > 0) {
        await tx.jobRequiredSkill.createMany({
          data: data.requiredSkillIds.map((skillId) => ({
            jobId: createdJob.id,
            skillId,
          })),
        });
      }

      return createdJob;
    });

    logger.info(`Job created: ${job.id} by user: ${userId}`);

    // Invalidate related caches
    await this.invalidateJobCaches(userId);

    return this.getJobById(job.id, userId);
  }

  /**
   * Update a job
   */
  async updateJob(jobId: string, userId: string, data: UpdateJobInput): Promise<JobDetailResponse> {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: { requiredSkills: true },
    });

    if (!job) {
      throw new NotFoundError('İş ilanı bulunamadı', ErrorCodes.JOB_NOT_FOUND);
    }

    // Check ownership
    if (job.userId !== userId) {
      throw new ForbiddenError('Bu iş ilanını düzenleme yetkiniz yok', ErrorCodes.FORBIDDEN);
    }

    // Check if job is editable
    if (!EDITABLE_STATUSES.includes(job.status)) {
      throw new BadRequestError(
        `Bu statüdeki iş ilanı düzenlenemez: ${job.status}`,
        ErrorCodes.JOB_NOT_ACTIVE
      );
    }

    // Validate category if changing
    if (data.categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: data.categoryId },
      });

      if (!category || !category.isActive) {
        throw new BadRequestError('Geçersiz kategori', ErrorCodes.BAD_REQUEST);
      }
    }

    // Validate skills if provided
    if (data.requiredSkillIds) {
      const skills = await prisma.skill.findMany({
        where: { id: { in: data.requiredSkillIds } },
      });

      if (skills.length !== data.requiredSkillIds.length) {
        throw new BadRequestError('Bazı beceriler bulunamadı', ErrorCodes.BAD_REQUEST);
      }
    }

    // Geocode if postcode is changing
    let coords: { lat: number; lng: number } | null = null;
    if (data.locationPostcode && data.locationPostcode !== job.locationPostcode) {
      coords = await this.geocodePostcode(data.locationPostcode);
      if (!coords) {
        throw new BadRequestError('Geçersiz posta kodu', ErrorCodes.VALIDATION_INVALID_POSTCODE);
      }
    }

    // Update job with transaction
    await prisma.$transaction(async (tx) => {
      const updateData: Prisma.JobUpdateInput = {};

      if (data.title !== undefined) updateData.title = data.title;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.categoryId !== undefined) updateData.category = { connect: { id: data.categoryId } };
      if (data.locationAddress !== undefined) updateData.locationAddress = data.locationAddress;
      if (data.locationCity !== undefined) updateData.locationCity = data.locationCity;
      if (data.locationPostcode !== undefined) {
        updateData.locationPostcode = data.locationPostcode.toUpperCase().replace(/\s+/g, ' ').trim();
        if (coords) {
          updateData.locationLat = coords.lat;
          updateData.locationLng = coords.lng;
        }
      }
      if (data.jobDate !== undefined) {
        const newJobDate = new Date(data.jobDate);
        updateData.jobDate = newJobDate;
        // Recalculate expiry
        const expiryDays = await this.getSystemSetting('job_expiry_days', '7');
        const expiresAt = new Date(newJobDate);
        expiresAt.setDate(expiresAt.getDate() + parseInt(expiryDays, 10));
        updateData.expiresAt = expiresAt;
      }
      if (data.startTime !== undefined) updateData.startTime = data.startTime;
      if (data.endTime !== undefined) updateData.endTime = data.endTime;
      if (data.payAmount !== undefined) updateData.payAmount = data.payAmount;
      if (data.payType !== undefined) updateData.payType = data.payType as PayType;
      if (data.experienceLevel !== undefined)
        updateData.experienceLevel = data.experienceLevel as ExperienceLevel | null;

      await tx.job.update({
        where: { id: jobId },
        data: updateData,
      });

      // Update required skills if provided
      if (data.requiredSkillIds !== undefined) {
        // Delete existing
        await tx.jobRequiredSkill.deleteMany({
          where: { jobId },
        });

        // Add new
        if (data.requiredSkillIds.length > 0) {
          await tx.jobRequiredSkill.createMany({
            data: data.requiredSkillIds.map((skillId) => ({
              jobId,
              skillId,
            })),
          });
        }
      }
    });

    logger.info(`Job updated: ${jobId} by user: ${userId}`);

    // Invalidate caches
    await this.invalidateJobCaches(userId, jobId);

    return this.getJobById(jobId, userId);
  }

  /**
   * Get job by ID
   */
  async getJobById(
    jobId: string,
    viewerId?: string,
    options?: { incrementViews?: boolean }
  ): Promise<JobDetailResponse> {
    const cacheKey = cacheKeys.jobDetail(jobId);

    // Try cache first (without viewer-specific data)
    let job = await cacheService.get<JobDetailResponse>(cacheKey);

    if (!job) {
      const dbJob = await prisma.job.findUnique({
        where: { id: jobId },
        include: {
          category: {
            select: { id: true, name: true, slug: true, icon: true },
          },
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profilePhotoUrl: true,
            },
          },
          images: {
            orderBy: { sortOrder: 'asc' },
            select: { id: true, imageUrl: true, sortOrder: true },
          },
          requiredSkills: {
            include: {
              skill: {
                select: { id: true, name: true, slug: true },
              },
            },
          },
        },
      });

      if (!dbJob) {
        throw new NotFoundError('İş ilanı bulunamadı', ErrorCodes.JOB_NOT_FOUND);
      }

      // Get employer stats
      const employerStats = await prisma.review.aggregate({
        where: { revieweeId: dbJob.userId },
        _avg: { rating: true },
        _count: { rating: true },
      });

      job = {
        id: dbJob.id,
        title: dbJob.title,
        description: dbJob.description,
        categoryId: dbJob.categoryId,
        category: dbJob.category,
        locationAddress: dbJob.locationAddress,
        locationPostcode: dbJob.locationPostcode,
        locationCity: dbJob.locationCity,
        locationLat: dbJob.locationLat,
        locationLng: dbJob.locationLng,
        jobDate: dbJob.jobDate,
        startTime: dbJob.startTime,
        endTime: dbJob.endTime,
        payAmount: Number(dbJob.payAmount),
        payType: dbJob.payType,
        experienceLevel: dbJob.experienceLevel,
        status: dbJob.status,
        viewsCount: dbJob.viewsCount,
        applicationsCount: dbJob.applicationsCount,
        expiresAt: dbJob.expiresAt,
        createdAt: dbJob.createdAt,
        updatedAt: dbJob.updatedAt,
        employer: {
          id: dbJob.user.id,
          firstName: dbJob.user.firstName,
          lastName: dbJob.user.lastName,
          profilePhotoUrl: dbJob.user.profilePhotoUrl,
          averageRating: employerStats._avg.rating,
          totalReviews: employerStats._count.rating,
        },
        images: dbJob.images,
        requiredSkills: dbJob.requiredSkills.map((rs) => rs.skill),
      };

      // Cache the base job data
      await cacheService.set(cacheKey, job, CACHE_TTL.JOB_DETAIL);
    }

    // Add viewer-specific data
    if (viewerId) {
      // Check if saved
      const savedJob = await prisma.savedJob.findUnique({
        where: {
          userId_jobId: { userId: viewerId, jobId },
        },
      });
      job.isSaved = !!savedJob;

      // Check if owner
      job.isOwner = viewerId === job.employer.id;

      // Check if applied (only if not owner)
      if (!job.isOwner) {
        const application = await prisma.application.findUnique({
          where: {
            jobId_applicantId: { jobId, applicantId: viewerId },
          },
          select: { id: true, status: true },
        });
        if (application) {
          job.hasApplied = true;
          job.applicationStatus = application.status;
          job.applicationId = application.id;
        } else {
          job.hasApplied = false;
        }
      }
    }

    // Increment views (debounced)
    if (options?.incrementViews && viewerId !== job.employer.id) {
      await this.incrementViewCount(jobId, viewerId);
    }

    return job;
  }

  /**
   * Get user's own jobs
   */
  async getMyJobs(
    userId: string,
    query: GetMyJobsQuery
  ): Promise<{ jobs: JobListItem[]; total: number; page: number; totalPages: number }> {
    const { status, page, limit } = query;

    const where: Prisma.JobWhereInput = { userId };
    if (status) {
      where.status = status;
    }

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        include: {
          category: {
            select: { id: true, name: true, slug: true },
          },
          user: {
            select: { id: true, firstName: true, lastName: true, profilePhotoUrl: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.job.count({ where }),
    ]);

    const jobList: JobListItem[] = jobs.map((job) => ({
      id: job.id,
      title: job.title,
      locationCity: job.locationCity,
      locationPostcode: job.locationPostcode,
      locationLat: job.locationLat,
      locationLng: job.locationLng,
      jobDate: job.jobDate,
      startTime: job.startTime,
      payAmount: Number(job.payAmount),
      payType: job.payType,
      status: job.status,
      applicationsCount: job.applicationsCount,
      createdAt: job.createdAt,
      category: job.category,
      employer: job.user,
    }));

    return {
      jobs: jobList,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Search jobs with filters
   */
  async searchJobs(query: JobSearchQuery, viewerId?: string): Promise<JobSearchResult> {
    const {
      page,
      limit,
      sort,
      categoryId,
      categorySlug,
      postcode,
      city,
      lat,
      lng,
      radiusMiles,
      minPay,
      maxPay,
      payType,
      dateFrom,
      dateTo,
      experienceLevel,
      keyword,
      skills,
    } = query;

    // Get center coordinates for location-based search
    let centerLat: number | undefined;
    let centerLng: number | undefined;

    if (lat !== undefined && lng !== undefined) {
      centerLat = lat;
      centerLng = lng;
    } else if (postcode) {
      const coords = await locationService.getCoordinates(postcode);
      if (coords) {
        centerLat = coords.lat;
        centerLng = coords.lng;
      }
    }

    // Build where clause
    const where: Prisma.JobWhereInput = {
      status: 'active',
      jobDate: { gte: new Date() },
    };

    // Category filter (include subcategories)
    if (categoryId) {
      const subcategories = await prisma.category.findMany({
        where: { OR: [{ id: categoryId }, { parentId: categoryId }] },
        select: { id: true },
      });
      where.categoryId = { in: subcategories.map((c) => c.id) };
    } else if (categorySlug) {
      const category = await prisma.category.findUnique({
        where: { slug: categorySlug },
        select: { id: true },
      });
      if (category) {
        const subcategories = await prisma.category.findMany({
          where: { OR: [{ id: category.id }, { parentId: category.id }] },
          select: { id: true },
        });
        where.categoryId = { in: subcategories.map((c) => c.id) };
      }
    }

    // Location bounding box filter (pre-filter before precise distance)
    if (centerLat !== undefined && centerLng !== undefined) {
      const bbox = getBoundingBox(centerLat, centerLng, radiusMiles);
      where.locationLat = { gte: bbox.minLat, lte: bbox.maxLat };
      where.locationLng = { gte: bbox.minLng, lte: bbox.maxLng };
    }

    // City filter
    if (city) {
      where.locationCity = { contains: city, mode: 'insensitive' };
    }

    // Pay filters
    if (minPay !== undefined || maxPay !== undefined) {
      where.payAmount = {};
      if (minPay !== undefined) where.payAmount.gte = minPay;
      if (maxPay !== undefined) where.payAmount.lte = maxPay;
    }

    if (payType) {
      where.payType = payType;
    }

    // Date filters
    if (dateFrom) {
      where.jobDate = { ...(where.jobDate as object), gte: new Date(dateFrom) };
    }
    if (dateTo) {
      where.jobDate = { ...(where.jobDate as object), lte: new Date(dateTo) };
    }

    // Experience level
    if (experienceLevel) {
      where.experienceLevel = experienceLevel;
    }

    // Keyword search
    if (keyword) {
      where.OR = [
        { title: { contains: keyword, mode: 'insensitive' } },
        { description: { contains: keyword, mode: 'insensitive' } },
      ];
    }

    // Skills filter
    if (skills) {
      const skillIds = skills.split(',').map((s) => s.trim());
      where.requiredSkills = {
        some: { skillId: { in: skillIds } },
      };
    }

    // Build orderBy
    let orderBy: Prisma.JobOrderByWithRelationInput = { createdAt: 'desc' };
    if (sort === 'highest_pay') {
      orderBy = { payAmount: 'desc' };
    } else if (sort === 'ending_soon') {
      orderBy = { jobDate: 'asc' };
    }
    // 'nearest' requires post-processing after fetching

    // Fetch jobs
    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          user: { select: { id: true, firstName: true, lastName: true, profilePhotoUrl: true } },
        },
        orderBy,
        skip: (page - 1) * limit,
        take: sort === 'nearest' ? limit * 3 : limit, // Fetch more for distance filtering
      }),
      prisma.job.count({ where }),
    ]);

    // Map to JobListItem with distance calculation
    let jobList: JobListItem[] = jobs.map((job) => {
      const item: JobListItem = {
        id: job.id,
        title: job.title,
        locationCity: job.locationCity,
        locationPostcode: job.locationPostcode,
        locationLat: job.locationLat,
        locationLng: job.locationLng,
        jobDate: job.jobDate,
        startTime: job.startTime,
        payAmount: Number(job.payAmount),
        payType: job.payType,
        status: job.status,
        applicationsCount: job.applicationsCount,
        createdAt: job.createdAt,
        category: job.category,
        employer: job.user,
      };

      // Calculate distance if center is provided
      if (centerLat !== undefined && centerLng !== undefined) {
        item.distance = calculateDistance(centerLat, centerLng, job.locationLat, job.locationLng);
      }

      return item;
    });

    // Filter by exact radius and sort by distance if needed
    if (centerLat !== undefined && centerLng !== undefined) {
      jobList = jobList.filter((j) => j.distance !== undefined && j.distance <= radiusMiles);

      if (sort === 'nearest') {
        jobList.sort((a, b) => (a.distance || 0) - (b.distance || 0));
      }
    }

    // Apply pagination after distance filtering for 'nearest' sort
    if (sort === 'nearest') {
      jobList = jobList.slice(0, limit);
    }

    // Build applied filters for response
    const appliedFilters: Record<string, unknown> = {};
    if (categoryId) appliedFilters.categoryId = categoryId;
    if (categorySlug) appliedFilters.categorySlug = categorySlug;
    if (postcode) appliedFilters.postcode = postcode;
    if (city) appliedFilters.city = city;
    if (centerLat !== undefined) appliedFilters.lat = centerLat;
    if (centerLng !== undefined) appliedFilters.lng = centerLng;
    if (radiusMiles !== 10) appliedFilters.radiusMiles = radiusMiles;
    if (minPay !== undefined) appliedFilters.minPay = minPay;
    if (maxPay !== undefined) appliedFilters.maxPay = maxPay;
    if (payType) appliedFilters.payType = payType;
    if (dateFrom) appliedFilters.dateFrom = dateFrom;
    if (dateTo) appliedFilters.dateTo = dateTo;
    if (experienceLevel) appliedFilters.experienceLevel = experienceLevel;
    if (keyword) appliedFilters.keyword = keyword;
    if (skills) appliedFilters.skills = skills;

    return {
      jobs: jobList,
      total: centerLat !== undefined ? jobList.length : total, // Adjust total for distance-filtered results
      page,
      totalPages: Math.ceil((centerLat !== undefined ? jobList.length : total) / limit),
      appliedFilters,
    };
  }

  /**
   * Get nearby jobs
   */
  async getNearbyJobs(query: NearbyJobsQuery): Promise<JobSearchResult> {
    const { postcode, lat, lng, radiusMiles, page, limit } = query;

    // Get coordinates
    let centerLat: number | undefined;
    let centerLng: number | undefined;

    if (lat !== undefined && lng !== undefined) {
      centerLat = lat;
      centerLng = lng;
    } else if (postcode) {
      const coords = await locationService.getCoordinates(postcode);
      if (coords) {
        centerLat = coords.lat;
        centerLng = coords.lng;
      }
    }

    if (centerLat === undefined || centerLng === undefined) {
      throw new BadRequestError(
        'Konum bilgisi gerekli. postcode veya lat/lng sağlayın.',
        ErrorCodes.VALIDATION_INVALID_POSTCODE
      );
    }

    // Use searchJobs with location parameters
    return this.searchJobs(
      {
        lat: centerLat,
        lng: centerLng,
        radiusMiles,
        page,
        limit,
        sort: 'nearest',
      },
      undefined
    );
  }

  /**
   * Update job status
   */
  async updateJobStatus(
    jobId: string,
    userId: string,
    newStatus: JobStatus
  ): Promise<JobDetailResponse> {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new NotFoundError('İş ilanı bulunamadı', ErrorCodes.JOB_NOT_FOUND);
    }

    // Check ownership
    if (job.userId !== userId) {
      throw new ForbiddenError('Bu iş ilanını değiştirme yetkiniz yok', ErrorCodes.FORBIDDEN);
    }

    // Check transition is allowed
    const allowedTransitions = OWNER_STATUS_TRANSITIONS[job.status];
    if (!allowedTransitions.includes(newStatus)) {
      throw new BadRequestError(
        `${job.status} statüsünden ${newStatus} statüsüne geçiş yapılamaz`,
        ErrorCodes.BAD_REQUEST
      );
    }

    // If marking as filled, reject pending applications
    if (newStatus === 'filled') {
      await prisma.application.updateMany({
        where: { jobId, status: 'pending' },
        data: { status: 'rejected' },
      });
    }

    await prisma.job.update({
      where: { id: jobId },
      data: { status: newStatus },
    });

    logger.info(`Job status updated: ${jobId} -> ${newStatus} by user: ${userId}`);

    // Invalidate caches
    await this.invalidateJobCaches(userId, jobId);

    return this.getJobById(jobId, userId);
  }

  /**
   * Delete a job (soft delete)
   */
  async deleteJob(jobId: string, userId: string): Promise<void> {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new NotFoundError('İş ilanı bulunamadı', ErrorCodes.JOB_NOT_FOUND);
    }

    // Check ownership
    if (job.userId !== userId) {
      throw new ForbiddenError('Bu iş ilanını silme yetkiniz yok', ErrorCodes.FORBIDDEN);
    }

    // Soft delete - change status to expired
    await prisma.job.update({
      where: { id: jobId },
      data: { status: 'expired' },
    });

    logger.info(`Job deleted (soft): ${jobId} by user: ${userId}`);

    // Invalidate caches
    await this.invalidateJobCaches(userId, jobId);
  }

  /**
   * Save/Unsave job
   */
  async saveJob(jobId: string, userId: string): Promise<void> {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new NotFoundError('İş ilanı bulunamadı', ErrorCodes.JOB_NOT_FOUND);
    }

    if (job.status !== 'active') {
      throw new BadRequestError('Sadece aktif ilanlar kaydedilebilir', ErrorCodes.JOB_NOT_ACTIVE);
    }

    if (job.userId === userId) {
      throw new BadRequestError('Kendi ilanınızı kaydedemezsiniz', ErrorCodes.BAD_REQUEST);
    }

    await prisma.savedJob.upsert({
      where: {
        userId_jobId: { userId, jobId },
      },
      create: { userId, jobId },
      update: {},
    });

    logger.info(`Job saved: ${jobId} by user: ${userId}`);
  }

  async unsaveJob(jobId: string, userId: string): Promise<void> {
    await prisma.savedJob.deleteMany({
      where: { userId, jobId },
    });

    logger.info(`Job unsaved: ${jobId} by user: ${userId}`);
  }

  /**
   * Get saved jobs
   */
  async getSavedJobs(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ jobs: JobListItem[]; total: number; page: number; totalPages: number }> {
    const where: Prisma.SavedJobWhereInput = {
      userId,
      job: {
        status: 'active',
        jobDate: { gte: new Date() },
      },
    };

    const [savedJobs, total] = await Promise.all([
      prisma.savedJob.findMany({
        where,
        include: {
          job: {
            include: {
              category: {
                select: { id: true, name: true, slug: true },
              },
              user: {
                select: { id: true, firstName: true, lastName: true, profilePhotoUrl: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.savedJob.count({ where }),
    ]);

    const jobList: JobListItem[] = savedJobs.map((sj) => ({
      id: sj.job.id,
      title: sj.job.title,
      locationCity: sj.job.locationCity,
      locationPostcode: sj.job.locationPostcode,
      locationLat: sj.job.locationLat,
      locationLng: sj.job.locationLng,
      jobDate: sj.job.jobDate,
      startTime: sj.job.startTime,
      payAmount: Number(sj.job.payAmount),
      payType: sj.job.payType,
      status: sj.job.status,
      applicationsCount: sj.job.applicationsCount,
      createdAt: sj.job.createdAt,
      category: sj.job.category,
      employer: sj.job.user,
    }));

    return {
      jobs: jobList,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ==================== Private Helpers ====================

  private async geocodePostcode(postcode: string): Promise<{ lat: number; lng: number } | null> {
    try {
      const cleanPostcode = postcode.toUpperCase().replace(/\s+/g, ' ').trim();
      const response = await fetch(
        `https://api.postcodes.io/postcodes/${encodeURIComponent(cleanPostcode)}`
      );

      if (!response.ok) {
        logger.warn(`Postcode lookup failed for: ${postcode}`);
        return null;
      }

      const data = (await response.json()) as {
        status: number;
        result?: { latitude: number; longitude: number };
      };

      if (data.status === 200 && data.result) {
        return {
          lat: data.result.latitude,
          lng: data.result.longitude,
        };
      }

      return null;
    } catch (error) {
      logger.error('Postcode geocoding error:', error);
      return null;
    }
  }

  private async getSystemSetting(key: string, defaultValue: string): Promise<string> {
    try {
      const setting = await prisma.systemSetting.findUnique({
        where: { key },
      });
      return setting?.value ?? defaultValue;
    } catch {
      return defaultValue;
    }
  }

  private async incrementViewCount(jobId: string, viewerId?: string): Promise<void> {
    const viewKey = cacheKeys.jobView(jobId, viewerId ?? null);

    // Check if already viewed recently (1 hour debounce)
    const alreadyViewed = await cacheService.exists(viewKey);
    if (alreadyViewed) {
      return;
    }

    // Mark as viewed
    await cacheService.set(viewKey, '1', CACHE_TTL.VIEW_DEBOUNCE);

    // Increment count
    await prisma.job.update({
      where: { id: jobId },
      data: { viewsCount: { increment: 1 } },
    });
  }

  private async invalidateJobCaches(userId: string, jobId?: string): Promise<void> {
    const keysToDelete: string[] = [];

    if (jobId) {
      keysToDelete.push(cacheKeys.jobDetail(jobId));
    }

    // Invalidate user's job list cache
    keysToDelete.push(cacheKeys.jobsByUser(userId));

    // Delete all matching keys
    await Promise.all(keysToDelete.map((key) => cacheService.del(key)));
  }
}

export const jobService = new JobService();
export default jobService;
