/**
 * User Validation Schemas
 */

import { z } from 'zod';
import {
  idSchema,
  emailSchema,
  phoneSchema,
  nameSchema,
  bioSchema,
  postcodeSchema,
  latitudeSchema,
  longitudeSchema,
  paginationSchema,
  ratingSchema,
  deviceTokenSchema,
} from './common.schema';

// Update profile schema
export const updateProfileSchema = z.object({
  body: z.object({
    firstName: nameSchema.optional(),
    lastName: nameSchema.optional(),
    phone: phoneSchema,
    bio: bioSchema,
    dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    locationPostcode: postcodeSchema.optional(),
    locationCity: z.string().max(100).optional(),
    locationLat: latitudeSchema.optional(),
    locationLng: longitudeSchema.optional(),
    searchRadius: z.number().min(1).max(100).optional(),
    isAvailableForWork: z.boolean().optional(),
  }),
});

// Update skills schema
export const updateSkillsSchema = z.object({
  body: z.object({
    skills: z.array(idSchema).max(20, 'Maximum 20 skills allowed'),
  }),
});

// Update categories schema
export const updateCategoriesSchema = z.object({
  body: z.object({
    categories: z.array(idSchema).max(10, 'Maximum 10 categories allowed'),
  }),
});

// Add experience schema
export const addExperienceSchema = z.object({
  body: z.object({
    title: z.string().min(2).max(100),
    company: z.string().min(2).max(100).optional(),
    description: z.string().max(500).optional(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    isCurrent: z.boolean().default(false),
  }),
});

// Update experience schema
export const updateExperienceSchema = z.object({
  params: z.object({
    id: idSchema,
  }),
  body: z.object({
    title: z.string().min(2).max(100).optional(),
    company: z.string().min(2).max(100).optional(),
    description: z.string().max(500).optional(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
    isCurrent: z.boolean().optional(),
  }),
});

// Add portfolio item schema
export const addPortfolioSchema = z.object({
  body: z.object({
    title: z.string().min(2).max(100),
    description: z.string().max(500).optional(),
    imageUrl: z.string().url(),
    link: z.string().url().optional(),
  }),
});

// Update portfolio schema
export const updatePortfolioSchema = z.object({
  params: z.object({
    id: idSchema,
  }),
  body: z.object({
    title: z.string().min(2).max(100).optional(),
    description: z.string().max(500).optional(),
    imageUrl: z.string().url().optional(),
    link: z.string().url().optional().nullable(),
  }),
});

// Get user by ID schema
export const getUserSchema = z.object({
  params: z.object({
    id: idSchema,
  }),
});

// Get user reviews schema
export const getUserReviewsSchema = z.object({
  params: z.object({
    id: idSchema,
  }),
  query: paginationSchema,
});

// Create review schema
export const createReviewSchema = z.object({
  params: z.object({
    id: idSchema, // reviewee ID
  }),
  body: z.object({
    jobId: idSchema,
    rating: ratingSchema,
    comment: z.string().max(1000).optional(),
  }),
});

// Update notification preferences schema
export const updateNotificationPrefsSchema = z.object({
  body: z.object({
    newJobPush: z.boolean().optional(),
    newJobEmail: z.boolean().optional(),
    newJobEmailFrequency: z.enum(['daily', 'weekly', 'never']).optional(),
    applicationPush: z.boolean().optional(),
    applicationEmail: z.boolean().optional(),
    messagePush: z.boolean().optional(),
    reviewPush: z.boolean().optional(),
    reviewEmail: z.boolean().optional(),
    marketingEmail: z.boolean().optional(),
  }),
});

// Register device token schema
export const registerDeviceSchema = z.object({
  body: deviceTokenSchema,
});

// Unregister device token schema
export const unregisterDeviceSchema = z.object({
  body: z.object({
    token: z.string().min(1),
  }),
});

// Report user schema
export const reportUserSchema = z.object({
  params: z.object({
    id: idSchema,
  }),
  body: z.object({
    reason: z.enum([
      'spam',
      'harassment',
      'inappropriate_content',
      'fake_profile',
      'scam',
      'other',
    ]),
    description: z.string().max(1000).optional(),
    jobId: idSchema.optional(),
  }),
});

// Block user schema
export const blockUserSchema = z.object({
  params: z.object({
    id: idSchema,
  }),
});

// Type exports
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>['body'];
export type UpdateSkillsInput = z.infer<typeof updateSkillsSchema>['body'];
export type AddExperienceInput = z.infer<typeof addExperienceSchema>['body'];
export type AddPortfolioInput = z.infer<typeof addPortfolioSchema>['body'];
export type CreateReviewInput = z.infer<typeof createReviewSchema>['body'];
export type UpdateNotificationPrefsInput = z.infer<typeof updateNotificationPrefsSchema>['body'];
export type ReportUserInput = z.infer<typeof reportUserSchema>['body'];
