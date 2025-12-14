import { z } from 'zod';

// Apply to job schema
export const applyToJobSchema = z.object({
  message: z
    .string()
    .min(20, 'Your message must be at least 20 characters. Tell the employer why you are a good fit!')
    .max(500, 'Your message cannot exceed 500 characters'),
});

// Update application status schema (employer)
export const updateApplicationStatusSchema = z.object({
  status: z.enum(['accepted', 'rejected'], {
    message: 'Status must be either "accepted" or "rejected"',
  }),
});

// Application ID parameter
export const applicationIdSchema = z.object({
  id: z.string().uuid('Invalid application ID'),
});

// Job ID parameter for applications
export const jobIdParamSchema = z.object({
  jobId: z.string().uuid('Invalid job ID'),
});

// Get applications query schema
export const getApplicationsQuerySchema = z.object({
  status: z
    .enum(['pending', 'accepted', 'rejected', 'withdrawn'], {
      message: 'Invalid status filter',
    })
    .optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
});

// Types
export type ApplyToJobInput = z.infer<typeof applyToJobSchema>;
export type UpdateApplicationStatusInput = z.infer<typeof updateApplicationStatusSchema>;
export type GetApplicationsQuery = z.infer<typeof getApplicationsQuerySchema>;
