import { z } from 'zod';

// Report types
export const reportTypeEnum = z.enum(['user', 'job'], {
  message: 'Report type must be "user" or "job"',
});

// Report reasons
export const reportReasonEnum = z.enum([
  'spam',
  'fraud',
  'harassment',
  'inappropriate',
  'fake_listing',
  'misleading',
  'other',
], {
  message: 'Invalid report reason',
});

// Create report schema
export const createReportSchema = z.object({
  type: reportTypeEnum,
  targetId: z.string().uuid({ message: 'Invalid target ID' }),
  reason: reportReasonEnum,
  description: z
    .string()
    .max(1000, { message: 'Description must be at most 1000 characters' })
    .trim()
    .optional(),
  evidenceUrls: z
    .array(z.string().url({ message: 'Invalid URL' }))
    .max(5, { message: 'A maximum of 5 evidence URLs can be added' })
    .optional(),
});

export type CreateReportInput = z.infer<typeof createReportSchema>;

// Get reports query schema
export const getReportsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
  status: z.enum(['pending', 'investigating', 'resolved', 'dismissed']).optional(),
});

export type GetReportsQuery = z.infer<typeof getReportsQuerySchema>;

// Block user schema
export const blockUserSchema = z.object({
  reason: z
    .string()
    .max(500, { message: 'Reason must be at most 500 characters' })
    .trim()
    .optional(),
});

export type BlockUserInput = z.infer<typeof blockUserSchema>;

// User ID param schema
export const userIdParamSchema = z.object({
  id: z.string().uuid({ message: 'Invalid user ID' }),
});

// Get blocked users query schema
export const getBlockedUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
});

export type GetBlockedUsersQuery = z.infer<typeof getBlockedUsersQuerySchema>;
