import { z } from 'zod';

// Rating validator (1-5)
const ratingSchema = z.coerce
  .number()
  .int({ message: 'Rating must be a whole number' })
  .min(1, { message: 'Rating must be at least 1' })
  .max(5, { message: 'Rating must be at most 5' });

// Optional rating validator
const optionalRatingSchema = z.coerce
  .number()
  .int({ message: 'Rating must be a whole number' })
  .min(1, { message: 'Rating must be at least 1' })
  .max(5, { message: 'Rating must be at most 5' })
  .optional();

// Create review schema
export const createReviewSchema = z.object({
  jobId: z.string().uuid({ message: 'Invalid job ID' }),
  rating: ratingSchema,
  punctualityRating: optionalRatingSchema,
  qualityRating: optionalRatingSchema,
  communicationRating: optionalRatingSchema,
  comment: z
    .string()
    .min(20, { message: 'Comment must be at least 20 characters' })
    .max(1000, { message: 'Comment must be at most 1000 characters' })
    .trim()
    .optional(),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;

// Get reviews query schema
export const getReviewsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
});

export type GetReviewsQuery = z.infer<typeof getReviewsQuerySchema>;

// User ID param schema
export const userIdParamSchema = z.object({
  id: z.string().uuid({ message: 'Invalid user ID' }),
});

// Review ID param schema
export const reviewIdParamSchema = z.object({
  id: z.string().uuid({ message: 'Invalid review ID' }),
});

// Report review schema
export const reportReviewSchema = z.object({
  reason: z.string()
    .min(10, { message: 'Reason must be at least 10 characters' })
    .max(500, { message: 'Reason must be at most 500 characters' })
    .trim(),
});

export type ReportReviewInput = z.infer<typeof reportReviewSchema>;
