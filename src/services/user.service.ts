import { prisma } from '../config/database';
import { AppError, ErrorCodes } from '../utils/AppError';
import { cacheService } from './cache.service';
import { cacheKeys } from '../utils/cacheKeys';
import { CACHE_TTL } from '../utils/cacheTTL';
import { tokenService } from './token.service';
import logger from '../utils/logger';

interface UpdateProfileInput {
  firstName?: string;
  lastName?: string;
  phone?: string | null;
  bio?: string | null;
  locationCity?: string | null;
  locationPostcode?: string | null;
  isJobSeeker?: boolean;
  isEmployer?: boolean;
}

interface UpdateSettingsInput {
  allowMessages?: boolean;
  showPhone?: boolean;
}

interface UserProfileResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  phoneVerified: boolean;
  profilePhotoUrl: string | null;
  bio: string | null;
  locationCity: string | null;
  locationPostcode: string | null;
  locationLat: number | null;
  locationLng: number | null;
  notificationRadiusMiles: number;
  isJobSeeker: boolean;
  isEmployer: boolean;
  isActivelyLooking: boolean;
  allowMessages: boolean;
  showPhone: boolean;
  emailVerified: boolean;
  role: string;
  status: string;
  createdAt: Date;
  stats?: {
    totalJobsPosted: number;
    totalApplications: number;
    averageRating: number | null;
    totalReviews: number;
    profileCompleteness: number;
  };
}

interface PublicProfileResponse {
  id: string;
  firstName: string;
  lastName: string;
  profilePhotoUrl: string | null;
  bio: string | null;
  locationCity: string | null;
  isJobSeeker: boolean;
  isEmployer: boolean;
  isActivelyLooking: boolean;
  memberSince: Date;
  stats: {
    averageRating: number | null;
    totalReviews: number;
    totalJobsPosted: number;
    totalJobsCompleted: number;
  };
  skills: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
  categories: Array<{
    id: string;
    name: string;
    slug: string;
    icon: string | null;
  }>;
  experiences: Array<{
    id: string;
    title: string;
    company: string;
    description: string | null;
    startDate: Date;
    endDate: Date | null;
    isCurrent: boolean;
  }>;
  portfolio: Array<{
    id: string;
    title: string;
    description: string | null;
    imageUrl: string;
  }>;
}

class UserService {
  async getProfile(userId: string): Promise<UserProfileResponse> {
    const cacheKey = cacheKeys.userProfile(userId);

    const cached = await cacheService.get<UserProfileResponse>(cacheKey);
    if (cached) return cached;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        skills: { include: { skill: true } },
        categories: { include: { category: true } },
      },
    });

    if (!user) {
      throw new AppError('User not found', 404, ErrorCodes.USER_NOT_FOUND);
    }

    const stats = await this.getUserStats(userId);
    const completeness = this.calculateProfileCompleteness(user);

    const profile: UserProfileResponse = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      phoneVerified: user.phoneVerified,
      profilePhotoUrl: user.profilePhotoUrl,
      bio: user.bio,
      locationCity: user.locationCity,
      locationPostcode: user.locationPostcode,
      locationLat: user.locationLat,
      locationLng: user.locationLng,
      notificationRadiusMiles: user.notificationRadiusMiles,
      isJobSeeker: user.isJobSeeker,
      isEmployer: user.isEmployer,
      isActivelyLooking: user.isActivelyLooking,
      allowMessages: user.allowMessages,
      showPhone: user.showPhone,
      emailVerified: user.emailVerified,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
      stats: {
        ...stats,
        profileCompleteness: completeness,
      },
    };

    await cacheService.set(cacheKey, profile, CACHE_TTL.USER_PROFILE);
    return profile;
  }

  async updateProfile(userId: string, data: UpdateProfileInput): Promise<UserProfileResponse> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError('User not found', 404, ErrorCodes.USER_NOT_FOUND);
    }

    let locationLat: number | undefined;
    let locationLng: number | undefined;

    // If postcode is being updated, geocode it
    if (data.locationPostcode && data.locationPostcode !== user.locationPostcode) {
      const coords = await this.geocodePostcode(data.locationPostcode);
      if (coords) {
        locationLat = coords.lat;
        locationLng = coords.lng;
      }
    }

    const updateData: Record<string, unknown> = {};

    if (data.firstName !== undefined) updateData.firstName = data.firstName;
    if (data.lastName !== undefined) updateData.lastName = data.lastName;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.bio !== undefined) updateData.bio = data.bio;
    if (data.locationCity !== undefined) updateData.locationCity = data.locationCity;
    if (data.locationPostcode !== undefined) {
      updateData.locationPostcode = data.locationPostcode;
      if (locationLat !== undefined) updateData.locationLat = locationLat;
      if (locationLng !== undefined) updateData.locationLng = locationLng;
    }
    if (data.isJobSeeker !== undefined) updateData.isJobSeeker = data.isJobSeeker;
    if (data.isEmployer !== undefined) updateData.isEmployer = data.isEmployer;

    await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    // Invalidate cache
    await cacheService.del(cacheKeys.userProfile(userId));

    logger.info(`User profile updated: ${userId}`);
    return this.getProfile(userId);
  }

  async updateSettings(userId: string, data: UpdateSettingsInput): Promise<UserProfileResponse> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError('User not found', 404, ErrorCodes.USER_NOT_FOUND);
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        allowMessages: data.allowMessages,
        showPhone: data.showPhone,
      },
    });

    // Invalidate cache
    await cacheService.del(cacheKeys.userProfile(userId));

    logger.info(`User settings updated: ${userId}`);
    return this.getProfile(userId);
  }

  async toggleActivelyLooking(userId: string, isActivelyLooking: boolean): Promise<UserProfileResponse> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError('User not found', 404, ErrorCodes.USER_NOT_FOUND);
    }

    await prisma.user.update({
      where: { id: userId },
      data: { isActivelyLooking },
    });

    // Invalidate cache
    await cacheService.del(cacheKeys.userProfile(userId));

    logger.info(`User actively looking status updated: ${userId} -> ${isActivelyLooking}`);

    // TODO: If turning on, trigger job matching notification check

    return this.getProfile(userId);
  }

  async updateProfilePhoto(userId: string, photoUrl: string | null): Promise<UserProfileResponse> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError('User not found', 404, ErrorCodes.USER_NOT_FOUND);
    }

    await prisma.user.update({
      where: { id: userId },
      data: { profilePhotoUrl: photoUrl },
    });

    // Invalidate cache
    await cacheService.del(cacheKeys.userProfile(userId));

    logger.info(`User profile photo updated: ${userId}`);
    return this.getProfile(userId);
  }

  async updateNotificationRadius(userId: string, radiusMiles: number): Promise<UserProfileResponse> {
    if (radiusMiles < 1 || radiusMiles > 50) {
      throw new AppError(
        'Notification radius must be between 1 and 50 miles',
        400,
        ErrorCodes.VALIDATION_FAILED
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError('User not found', 404, ErrorCodes.USER_NOT_FOUND);
    }

    await prisma.user.update({
      where: { id: userId },
      data: { notificationRadiusMiles: radiusMiles },
    });

    // Invalidate cache
    await cacheService.del(cacheKeys.userProfile(userId));

    logger.info(`User notification radius updated: ${userId} -> ${radiusMiles} miles`);
    return this.getProfile(userId);
  }

  async getPublicProfile(userId: string, viewerId?: string): Promise<PublicProfileResponse> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        skills: {
          include: {
            skill: {
              select: { id: true, name: true, slug: true },
            },
          },
        },
        categories: {
          include: {
            category: {
              select: { id: true, name: true, slug: true, icon: true },
            },
          },
        },
        experiences: {
          orderBy: [{ isCurrent: 'desc' }, { endDate: 'desc' }, { startDate: 'desc' }],
          select: {
            id: true,
            title: true,
            company: true,
            description: true,
            startDate: true,
            endDate: true,
            isCurrent: true,
          },
        },
        portfolioItems: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            title: true,
            description: true,
            imageUrl: true,
          },
        },
      },
    });

    if (!user) {
      throw new AppError('User not found', 404, ErrorCodes.USER_NOT_FOUND);
    }

    if (user.status !== 'active') {
      throw new AppError('User not found', 404, ErrorCodes.USER_NOT_FOUND);
    }

    // Check if viewer is blocked
    if (viewerId) {
      const isBlocked = await prisma.blockedUser.findFirst({
        where: {
          OR: [
            { blockerId: userId, blockedId: viewerId },
            { blockerId: viewerId, blockedId: userId },
          ],
        },
      });

      if (isBlocked) {
        throw new AppError('User not found', 404, ErrorCodes.USER_NOT_FOUND);
      }
    }

    const stats = await this.getPublicStats(userId);

    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      profilePhotoUrl: user.profilePhotoUrl,
      bio: user.bio,
      locationCity: user.locationCity,
      isJobSeeker: user.isJobSeeker,
      isEmployer: user.isEmployer,
      isActivelyLooking: user.isActivelyLooking,
      memberSince: user.createdAt,
      stats,
      skills: user.skills.map((us: { skill: { id: string; name: string; slug: string } }) => us.skill),
      categories: user.categories.map((uc: { category: { id: string; name: string; slug: string; icon: string | null } }) => uc.category),
      experiences: user.experiences,
      portfolio: user.portfolioItems,
    };
  }

  async deleteAccount(userId: string, hard: boolean = false): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError('User not found', 404, ErrorCodes.USER_NOT_FOUND);
    }

    // Revoke all tokens
    await tokenService.revokeAllUserTokens(userId);

    if (hard) {
      // Hard delete - actually delete the user and cascade
      await prisma.user.delete({
        where: { id: userId },
      });
      logger.info(`User hard deleted: ${userId}`);
    } else {
      // Soft delete - anonymize and mark as deleted
      await prisma.user.update({
        where: { id: userId },
        data: {
          status: 'deleted',
          email: `deleted_${userId}@deleted.gighub.uk`,
          firstName: 'Deleted',
          lastName: 'User',
          phone: null,
          bio: null,
          profilePhotoUrl: null,
          locationCity: null,
          locationPostcode: null,
          locationLat: null,
          locationLng: null,
          appleId: null,
          googleId: null,
        },
      });
      logger.info(`User soft deleted (anonymized): ${userId}`);
    }

    // Invalidate cache
    await cacheService.del(cacheKeys.userProfile(userId));
  }

  private async getUserStats(userId: string): Promise<{
    totalJobsPosted: number;
    totalApplications: number;
    averageRating: number | null;
    totalReviews: number;
  }> {
    const [jobsCount, applicationsCount, reviewStats] = await Promise.all([
      prisma.job.count({
        where: { userId, status: { not: 'expired' } },
      }),
      prisma.application.count({
        where: { applicantId: userId },
      }),
      prisma.review.aggregate({
        where: { revieweeId: userId },
        _avg: { rating: true },
        _count: { rating: true },
      }),
    ]);

    return {
      totalJobsPosted: jobsCount,
      totalApplications: applicationsCount,
      averageRating: reviewStats._avg.rating,
      totalReviews: reviewStats._count.rating,
    };
  }

  private async getPublicStats(userId: string): Promise<{
    averageRating: number | null;
    totalReviews: number;
    totalJobsPosted: number;
    totalJobsCompleted: number;
  }> {
    const [reviewStats, jobsPosted, jobsCompleted] = await Promise.all([
      prisma.review.aggregate({
        where: { revieweeId: userId },
        _avg: { rating: true },
        _count: { rating: true },
      }),
      prisma.job.count({
        where: { userId, status: { not: 'expired' } },
      }),
      prisma.job.count({
        where: { userId, status: 'completed' },
      }),
    ]);

    return {
      averageRating: reviewStats._avg.rating,
      totalReviews: reviewStats._count.rating,
      totalJobsPosted: jobsPosted,
      totalJobsCompleted: jobsCompleted,
    };
  }

  private calculateProfileCompleteness(user: {
    profilePhotoUrl: string | null;
    bio: string | null;
    phoneVerified: boolean;
    locationPostcode: string | null;
    skills: unknown[];
    categories: unknown[];
  }): number {
    let completeness = 0;

    // Has profile photo (20%)
    if (user.profilePhotoUrl) completeness += 20;

    // Has bio (15%)
    if (user.bio && user.bio.length > 10) completeness += 15;

    // Phone verified (15%)
    if (user.phoneVerified) completeness += 15;

    // Has location (20%)
    if (user.locationPostcode) completeness += 20;

    // Has skills (15%)
    if (user.skills.length > 0) completeness += 15;

    // Has categories (15%)
    if (user.categories.length > 0) completeness += 15;

    return completeness;
  }

  private async geocodePostcode(postcode: string): Promise<{ lat: number; lng: number } | null> {
    try {
      const response = await fetch(
        `https://api.postcodes.io/postcodes/${encodeURIComponent(postcode)}`
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
}

export const userService = new UserService();
export default userService;
