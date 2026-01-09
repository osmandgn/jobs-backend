import { z } from 'zod';

// UK postcode regex - matches formats like: SW1A 1AA, EC1A 1BB, W1A 0AX, M1 1AE, etc.
const ukPostcodeRegex = /^[A-Z]{1,2}[0-9][0-9A-Z]?\s?[0-9][A-Z]{2}$/i;

// Time format regex - HH:MM (24-hour)
const timeFormatRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;

// Create job schema
export const createJobSchema = z.object({
  title: z
    .string()
    .min(5, 'Job title must be at least 5 characters')
    .max(100, 'Job title cannot exceed 100 characters'),
  description: z
    .string()
    .min(20, 'Job description must be at least 20 characters')
    .max(5000, 'Job description cannot exceed 5000 characters'),
  categoryId: z.string().uuid('Please select a valid category'),
  locationAddress: z
    .string()
    .max(200, 'Address cannot exceed 200 characters')
    .optional(),
  locationPostcode: z
    .string()
    .regex(ukPostcodeRegex, 'Please enter a valid UK postcode (e.g., SW1A 1AA)')
    .optional()
    .nullable(),
  locationCity: z
    .string()
    .max(100, 'City name cannot exceed 100 characters')
    .optional(),
  isRemote: z.boolean().optional().default(false),
  jobDate: z
    .string()
    .refine((val) => {
      const date = new Date(val);
      return !isNaN(date.getTime());
    }, 'Please enter a valid date')
    .refine((val) => {
      const date = new Date(val);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return date >= today;
    }, 'Job date must be today or in the future')
    .optional()
    .nullable(),
  startTime: z
    .string()
    .regex(timeFormatRegex, 'Please enter a valid time (e.g., 09:00)')
    .optional()
    .nullable(),
  endTime: z
    .string()
    .regex(timeFormatRegex, 'Please enter a valid time (e.g., 17:00)')
    .optional(),
  payAmount: z
    .number()
    .positive('Pay amount must be greater than zero')
    .max(10000, 'Pay amount cannot exceed £10,000'),
  payType: z.enum(['hourly', 'fixed'], {
    message: 'Pay type must be either "hourly" or "fixed"',
  }),
  experienceLevel: z
    .enum(['entry', 'intermediate', 'expert'], {
      message: 'Experience level must be "entry", "intermediate", or "expert"',
    })
    .optional(),
  requiredSkillIds: z
    .array(z.string().uuid('Invalid skill ID'))
    .max(10, 'You can select up to 10 skills')
    .optional(),
  imageUrls: z
    .array(z.string().url('Invalid image URL'))
    .max(10, 'You can upload up to 10 images')
    .optional(),
});

// Update job schema
export const updateJobSchema = z.object({
  title: z
    .string()
    .min(5, 'Job title must be at least 5 characters')
    .max(100, 'Job title cannot exceed 100 characters')
    .optional(),
  description: z
    .string()
    .min(20, 'Job description must be at least 20 characters')
    .max(5000, 'Job description cannot exceed 5000 characters')
    .optional(),
  categoryId: z.string().uuid('Please select a valid category').optional(),
  locationAddress: z
    .string()
    .max(200, 'Address cannot exceed 200 characters')
    .nullable()
    .optional(),
  locationPostcode: z
    .string()
    .regex(ukPostcodeRegex, 'Please enter a valid UK postcode (e.g., SW1A 1AA)')
    .optional(),
  locationCity: z
    .string()
    .max(100, 'City name cannot exceed 100 characters')
    .nullable()
    .optional(),
  jobDate: z
    .string()
    .refine((val) => {
      const date = new Date(val);
      return !isNaN(date.getTime());
    }, 'Please enter a valid date')
    .refine((val) => {
      const date = new Date(val);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return date >= today;
    }, 'Job date must be today or in the future')
    .optional(),
  startTime: z
    .string()
    .regex(timeFormatRegex, 'Please enter a valid time (e.g., 09:00)')
    .optional(),
  endTime: z
    .string()
    .regex(timeFormatRegex, 'Please enter a valid time (e.g., 17:00)')
    .nullable()
    .optional(),
  payAmount: z
    .number()
    .positive('Pay amount must be greater than zero')
    .max(10000, 'Pay amount cannot exceed £10,000')
    .optional(),
  payType: z
    .enum(['hourly', 'fixed'], {
      message: 'Pay type must be either "hourly" or "fixed"',
    })
    .optional(),
  experienceLevel: z
    .enum(['entry', 'intermediate', 'expert'], {
      message: 'Experience level must be "entry", "intermediate", or "expert"',
    })
    .nullable()
    .optional(),
  requiredSkillIds: z
    .array(z.string().uuid('Invalid skill ID'))
    .max(10, 'You can select up to 10 skills')
    .optional(),
  imageUrls: z
    .array(z.string().url('Invalid image URL'))
    .max(10, 'You can upload up to 10 images')
    .optional(),
});

// Update job status schema
export const updateJobStatusSchema = z.object({
  status: z.enum(['active', 'paused', 'filled', 'completed', 'expired'], {
    message: 'Invalid status. Allowed values: active, paused, filled, completed, expired',
  }),
});

// Job ID parameter
export const jobIdSchema = z.object({
  id: z.string().uuid('Invalid job ID'),
});

// Get my jobs query schema
export const getMyJobsQuerySchema = z.object({
  status: z
    .enum(['draft', 'pending_review', 'active', 'paused', 'filled', 'completed', 'expired', 'rejected'])
    .optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
});

// Job search/filter query schema
export const jobSearchQuerySchema = z.object({
  // Pagination
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),

  // Sorting
  sort: z
    .enum(['newest', 'nearest', 'highest_pay', 'ending_soon'], {
      message: 'Invalid sort option. Allowed values: newest, nearest, highest_pay, ending_soon',
    })
    .default('newest'),

  // Category filters
  categoryId: z.string().uuid('Invalid category ID').optional(),
  categorySlug: z.string().optional(),

  // Location filters
  postcode: z.string().optional(),
  city: z.string().optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radiusMiles: z.coerce.number().int().min(1).max(50).default(10),

  // Pay filters
  minPay: z.coerce.number().positive().optional(),
  maxPay: z.coerce.number().positive().optional(),
  payType: z.enum(['hourly', 'fixed']).optional(),

  // Date filters
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),

  // Other filters
  experienceLevel: z.enum(['entry', 'intermediate', 'expert']).optional(),
  keyword: z.string().max(100).optional(),
  skills: z.string().optional(), // comma-separated skill IDs
});

// Nearby jobs query schema
export const nearbyJobsQuerySchema = z.object({
  // Location (one of these required)
  postcode: z.string().optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),

  // Options
  radiusMiles: z.coerce.number().int().min(1).max(50).default(10),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
});

// Types
export type CreateJobInput = z.infer<typeof createJobSchema>;
export type UpdateJobInput = z.infer<typeof updateJobSchema>;
export type UpdateJobStatusInput = z.infer<typeof updateJobStatusSchema>;
export type GetMyJobsQuery = z.infer<typeof getMyJobsQuerySchema>;
export type JobSearchQuery = z.infer<typeof jobSearchQuerySchema>;
export type NearbyJobsQuery = z.infer<typeof nearbyJobsQuerySchema>;
