import { z } from 'zod';

// UK phone number regex
const ukPhoneRegex = /^(\+44|0)7\d{9}$/;

// UK postcode regex (simplified)
const ukPostcodeRegex = /^[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}$/i;

export const updateProfileSchema = z.object({
  firstName: z
    .string()
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name must be at most 50 characters')
    .trim()
    .optional(),
  lastName: z
    .string()
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name must be at most 50 characters')
    .trim()
    .optional(),
  phone: z
    .string()
    .regex(ukPhoneRegex, 'Invalid UK phone number format')
    .optional()
    .nullable(),
  bio: z
    .string()
    .max(1000, 'Bio must be at most 1000 characters')
    .trim()
    .optional()
    .nullable(),
  locationCity: z
    .string()
    .max(100, 'City name must be at most 100 characters')
    .trim()
    .optional()
    .nullable(),
  locationPostcode: z
    .string()
    .regex(ukPostcodeRegex, 'Invalid UK postcode format')
    .optional()
    .nullable(),
  isJobSeeker: z.boolean().optional(),
  isEmployer: z.boolean().optional(),
});

export const updateSettingsSchema = z.object({
  allowMessages: z.boolean().optional(),
  showPhone: z.boolean().optional(),
});

export const toggleActivelyLookingSchema = z.object({
  isActivelyLooking: z.boolean(),
});

export const updateNotificationRadiusSchema = z.object({
  radiusMiles: z
    .number()
    .min(1, 'Radius must be at least 1 mile')
    .max(50, 'Radius must be at most 50 miles'),
});

// Type exports
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
export type ToggleActivelyLookingInput = z.infer<typeof toggleActivelyLookingSchema>;
export type UpdateNotificationRadiusInput = z.infer<typeof updateNotificationRadiusSchema>;
