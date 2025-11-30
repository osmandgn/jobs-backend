import { z } from 'zod';

// UK postcode regex - matches formats like: SW1A 1AA, EC1A 1BB, W1A 0AX, M1 1AE, etc.
const ukPostcodeRegex = /^[A-Z]{1,2}[0-9][0-9A-Z]?\s?[0-9][A-Z]{2}$/i;

// Time format regex - HH:MM (24-hour)
const timeFormatRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;

// Create job schema
export const createJobSchema = z.object({
  title: z
    .string()
    .min(5, 'İş başlığı en az 5 karakter olmalıdır')
    .max(100, 'İş başlığı en fazla 100 karakter olabilir'),
  description: z
    .string()
    .min(20, 'İş açıklaması en az 20 karakter olmalıdır')
    .max(5000, 'İş açıklaması en fazla 5000 karakter olabilir'),
  categoryId: z.string().uuid('Geçersiz kategori ID'),
  locationAddress: z
    .string()
    .max(200, 'Adres en fazla 200 karakter olabilir')
    .optional(),
  locationPostcode: z
    .string()
    .regex(ukPostcodeRegex, 'Geçerli bir UK posta kodu giriniz (örn: SW1A 1AA)'),
  locationCity: z
    .string()
    .max(100, 'Şehir adı en fazla 100 karakter olabilir')
    .optional(),
  jobDate: z
    .string()
    .refine((val) => {
      const date = new Date(val);
      return !isNaN(date.getTime());
    }, 'Geçerli bir tarih giriniz')
    .refine((val) => {
      const date = new Date(val);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return date >= today;
    }, 'İş tarihi bugün veya gelecekte olmalıdır'),
  startTime: z
    .string()
    .regex(timeFormatRegex, 'Geçerli bir saat formatı giriniz (örn: 09:00)'),
  endTime: z
    .string()
    .regex(timeFormatRegex, 'Geçerli bir saat formatı giriniz (örn: 17:00)')
    .optional(),
  payAmount: z
    .number()
    .positive('Ücret pozitif olmalıdır')
    .max(10000, 'Ücret en fazla 10000 olabilir'),
  payType: z.enum(['hourly', 'fixed'], {
    message: 'Ödeme tipi "hourly" veya "fixed" olmalıdır',
  }),
  experienceLevel: z
    .enum(['entry', 'intermediate', 'expert'], {
      message: 'Deneyim seviyesi "entry", "intermediate" veya "expert" olmalıdır',
    })
    .optional(),
  requiredSkillIds: z
    .array(z.string().uuid('Geçersiz skill ID'))
    .max(10, 'En fazla 10 beceri seçilebilir')
    .optional(),
});

// Update job schema
export const updateJobSchema = z.object({
  title: z
    .string()
    .min(5, 'İş başlığı en az 5 karakter olmalıdır')
    .max(100, 'İş başlığı en fazla 100 karakter olabilir')
    .optional(),
  description: z
    .string()
    .min(20, 'İş açıklaması en az 20 karakter olmalıdır')
    .max(5000, 'İş açıklaması en fazla 5000 karakter olabilir')
    .optional(),
  categoryId: z.string().uuid('Geçersiz kategori ID').optional(),
  locationAddress: z
    .string()
    .max(200, 'Adres en fazla 200 karakter olabilir')
    .nullable()
    .optional(),
  locationPostcode: z
    .string()
    .regex(ukPostcodeRegex, 'Geçerli bir UK posta kodu giriniz (örn: SW1A 1AA)')
    .optional(),
  locationCity: z
    .string()
    .max(100, 'Şehir adı en fazla 100 karakter olabilir')
    .nullable()
    .optional(),
  jobDate: z
    .string()
    .refine((val) => {
      const date = new Date(val);
      return !isNaN(date.getTime());
    }, 'Geçerli bir tarih giriniz')
    .refine((val) => {
      const date = new Date(val);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return date >= today;
    }, 'İş tarihi bugün veya gelecekte olmalıdır')
    .optional(),
  startTime: z
    .string()
    .regex(timeFormatRegex, 'Geçerli bir saat formatı giriniz (örn: 09:00)')
    .optional(),
  endTime: z
    .string()
    .regex(timeFormatRegex, 'Geçerli bir saat formatı giriniz (örn: 17:00)')
    .nullable()
    .optional(),
  payAmount: z
    .number()
    .positive('Ücret pozitif olmalıdır')
    .max(10000, 'Ücret en fazla 10000 olabilir')
    .optional(),
  payType: z
    .enum(['hourly', 'fixed'], {
      message: 'Ödeme tipi "hourly" veya "fixed" olmalıdır',
    })
    .optional(),
  experienceLevel: z
    .enum(['entry', 'intermediate', 'expert'], {
      message: 'Deneyim seviyesi "entry", "intermediate" veya "expert" olmalıdır',
    })
    .nullable()
    .optional(),
  requiredSkillIds: z
    .array(z.string().uuid('Geçersiz skill ID'))
    .max(10, 'En fazla 10 beceri seçilebilir')
    .optional(),
});

// Update job status schema
export const updateJobStatusSchema = z.object({
  status: z.enum(['active', 'paused', 'filled', 'completed', 'expired'], {
    message: 'Geçersiz status. İzin verilenler: active, paused, filled, completed, expired',
  }),
});

// Job ID parameter
export const jobIdSchema = z.object({
  id: z.string().uuid('Geçersiz iş ilanı ID'),
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
      message: 'Geçersiz sıralama. İzin verilenler: newest, nearest, highest_pay, ending_soon',
    })
    .default('newest'),

  // Category filters
  categoryId: z.string().uuid('Geçersiz kategori ID').optional(),
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
