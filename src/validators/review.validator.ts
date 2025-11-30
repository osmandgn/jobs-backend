import { z } from 'zod';

// Rating validator (1-5)
const ratingSchema = z.coerce
  .number()
  .int({ message: 'Puan tam sayı olmalıdır' })
  .min(1, { message: 'Puan en az 1 olmalıdır' })
  .max(5, { message: 'Puan en fazla 5 olabilir' });

// Optional rating validator
const optionalRatingSchema = z.coerce
  .number()
  .int({ message: 'Puan tam sayı olmalıdır' })
  .min(1, { message: 'Puan en az 1 olmalıdır' })
  .max(5, { message: 'Puan en fazla 5 olabilir' })
  .optional();

// Create review schema
export const createReviewSchema = z.object({
  jobId: z.string().uuid({ message: 'Geçersiz iş ID' }),
  rating: ratingSchema,
  punctualityRating: optionalRatingSchema,
  qualityRating: optionalRatingSchema,
  communicationRating: optionalRatingSchema,
  comment: z
    .string()
    .min(20, { message: 'Yorum en az 20 karakter olmalıdır' })
    .max(1000, { message: 'Yorum en fazla 1000 karakter olabilir' })
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
  id: z.string().uuid({ message: 'Geçersiz kullanıcı ID' }),
});

// Review ID param schema
export const reviewIdParamSchema = z.object({
  id: z.string().uuid({ message: 'Geçersiz değerlendirme ID' }),
});

// Report review schema
export const reportReviewSchema = z.object({
  reason: z.string()
    .min(10, { message: 'Sebep en az 10 karakter olmalıdır' })
    .max(500, { message: 'Sebep en fazla 500 karakter olabilir' })
    .trim(),
});

export type ReportReviewInput = z.infer<typeof reportReviewSchema>;
