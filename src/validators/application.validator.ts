import { z } from 'zod';

// Apply to job schema
export const applyToJobSchema = z.object({
  message: z
    .string()
    .min(50, 'Başvuru mesajı en az 50 karakter olmalıdır')
    .max(500, 'Başvuru mesajı en fazla 500 karakter olabilir'),
});

// Update application status schema (employer)
export const updateApplicationStatusSchema = z.object({
  status: z.enum(['accepted', 'rejected'], {
    message: 'Durum "accepted" veya "rejected" olmalıdır',
  }),
});

// Application ID parameter
export const applicationIdSchema = z.object({
  id: z.string().uuid('Geçersiz başvuru ID'),
});

// Job ID parameter for applications
export const jobIdParamSchema = z.object({
  jobId: z.string().uuid('Geçersiz iş ilanı ID'),
});

// Get applications query schema
export const getApplicationsQuerySchema = z.object({
  status: z
    .enum(['pending', 'accepted', 'rejected', 'withdrawn'], {
      message: 'Geçersiz durum filtresi',
    })
    .optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
});

// Types
export type ApplyToJobInput = z.infer<typeof applyToJobSchema>;
export type UpdateApplicationStatusInput = z.infer<typeof updateApplicationStatusSchema>;
export type GetApplicationsQuery = z.infer<typeof getApplicationsQuerySchema>;
