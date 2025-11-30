/**
 * Job Validation Schemas
 */

import { z } from 'zod';
import {
  idSchema,
  postcodeSchema,
  latitudeSchema,
  longitudeSchema,
  moneySchema,
  paginationSchema,
  sortOrderSchema,
} from './common.schema';

// Pay type enum
const payTypeSchema = z.enum(['hourly', 'fixed', 'daily']);

// Experience level enum
const experienceLevelSchema = z.enum(['entry', 'intermediate', 'expert']);

// Job status enum
const jobStatusSchema = z.enum(['draft', 'active', 'filled', 'completed', 'cancelled', 'expired']);

// Time format (HH:MM)
const timeSchema = z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)');

// Create job schema
export const createJobSchema = z.object({
  body: z.object({
    title: z
      .string()
      .min(5, 'Title must be at least 5 characters')
      .max(100, 'Title is too long'),
    description: z
      .string()
      .min(20, 'Description must be at least 20 characters')
      .max(2000, 'Description is too long'),
    categoryId: idSchema,
    locationAddress: z.string().max(200).optional(),
    locationPostcode: postcodeSchema,
    locationCity: z.string().max(100).optional(),
    locationLat: latitudeSchema,
    locationLng: longitudeSchema,
    jobDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
    startTime: timeSchema,
    endTime: timeSchema.optional(),
    payAmount: moneySchema,
    payType: payTypeSchema,
    experienceLevel: experienceLevelSchema.optional(),
    requiredSkills: z.array(idSchema).max(10).optional(),
    images: z.array(z.string().url()).max(5).optional(),
  }).refine((data) => {
    const jobDate = new Date(data.jobDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return jobDate >= today;
  }, { message: 'Job date must be today or in the future', path: ['jobDate'] }),
});

// Update job schema
export const updateJobSchema = z.object({
  params: z.object({
    id: idSchema,
  }),
  body: z.object({
    title: z.string().min(5).max(100).optional(),
    description: z.string().min(20).max(2000).optional(),
    categoryId: idSchema.optional(),
    locationAddress: z.string().max(200).optional(),
    locationPostcode: postcodeSchema.optional(),
    locationCity: z.string().max(100).optional(),
    locationLat: latitudeSchema.optional(),
    locationLng: longitudeSchema.optional(),
    jobDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    startTime: timeSchema.optional(),
    endTime: timeSchema.optional(),
    payAmount: moneySchema.optional(),
    payType: payTypeSchema.optional(),
    experienceLevel: experienceLevelSchema.optional().nullable(),
    requiredSkills: z.array(idSchema).max(10).optional(),
  }),
});

// Get job by ID schema
export const getJobSchema = z.object({
  params: z.object({
    id: idSchema,
  }),
});

// Search jobs schema
export const searchJobsSchema = z.object({
  query: paginationSchema.extend({
    q: z.string().max(100).optional(),
    category: idSchema.optional(),
    postcode: postcodeSchema.optional(),
    radius: z.coerce.number().min(1).max(100).default(10),
    minPay: z.coerce.number().min(0).optional(),
    maxPay: z.coerce.number().min(0).optional(),
    payType: payTypeSchema.optional(),
    experienceLevel: experienceLevelSchema.optional(),
    dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    sortBy: z.enum(['date', 'pay', 'distance', 'createdAt']).default('createdAt'),
    sortOrder: sortOrderSchema,
    status: jobStatusSchema.optional(),
  }),
});

// Apply to job schema
export const applyToJobSchema = z.object({
  params: z.object({
    id: idSchema,
  }),
  body: z.object({
    message: z
      .string()
      .min(10, 'Application message must be at least 10 characters')
      .max(1000, 'Application message is too long'),
  }),
});

// Update application status schema
export const updateApplicationStatusSchema = z.object({
  params: z.object({
    jobId: idSchema,
    applicationId: idSchema,
  }),
  body: z.object({
    status: z.enum(['accepted', 'rejected']),
  }),
});

// Get job applications schema
export const getJobApplicationsSchema = z.object({
  params: z.object({
    id: idSchema,
  }),
  query: paginationSchema.extend({
    status: z.enum(['pending', 'accepted', 'rejected', 'withdrawn']).optional(),
  }),
});

// Withdraw application schema
export const withdrawApplicationSchema = z.object({
  params: z.object({
    id: idSchema,
  }),
});

// Complete job schema
export const completeJobSchema = z.object({
  params: z.object({
    id: idSchema,
  }),
});

// Cancel job schema
export const cancelJobSchema = z.object({
  params: z.object({
    id: idSchema,
  }),
  body: z.object({
    reason: z.string().max(500).optional(),
  }),
});

// Type exports
export type CreateJobInput = z.infer<typeof createJobSchema>['body'];
export type UpdateJobInput = z.infer<typeof updateJobSchema>['body'];
export type SearchJobsInput = z.infer<typeof searchJobsSchema>['query'];
export type ApplyToJobInput = z.infer<typeof applyToJobSchema>['body'];
