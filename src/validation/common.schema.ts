/**
 * Common Zod Validation Schemas
 */

import { z } from 'zod';

// UK postcode regex
const UK_POSTCODE_REGEX = /^[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}$/i;

// UK phone number regex
const UK_PHONE_REGEX = /^(\+44|0)7\d{9}$/;

// Common field schemas
export const idSchema = z.string().uuid('Invalid ID format');

export const emailSchema = z.string().email('Invalid email format').max(255);

export const phoneSchema = z
  .string()
  .regex(UK_PHONE_REGEX, 'Invalid UK phone number format')
  .optional();

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128)
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    'Password must contain at least one lowercase, one uppercase and one number'
  );

export const postcodeSchema = z
  .string()
  .regex(UK_POSTCODE_REGEX, 'Invalid UK postcode format')
  .transform((val) => val.toUpperCase().replace(/\s/g, ' '));

export const nameSchema = z
  .string()
  .min(1, 'Name is required')
  .max(50, 'Name is too long')
  .regex(/^[a-zA-Z\s'-]+$/, 'Name contains invalid characters');

export const bioSchema = z.string().max(500, 'Bio is too long').optional();

export const urlSchema = z.string().url('Invalid URL format').optional();

export const dateSchema = z.string().datetime('Invalid date format');

export const futureDateSchema = z
  .string()
  .datetime()
  .refine((date) => new Date(date) > new Date(), {
    message: 'Date must be in the future',
  });

export const pastDateSchema = z
  .string()
  .datetime()
  .refine((date) => new Date(date) < new Date(), {
    message: 'Date must be in the past',
  });

export const ratingSchema = z
  .number()
  .int()
  .min(1, 'Rating must be at least 1')
  .max(5, 'Rating must be at most 5');

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const sortOrderSchema = z.enum(['asc', 'desc']).default('desc');

// Latitude/Longitude schemas
export const latitudeSchema = z.number().min(-90).max(90);
export const longitudeSchema = z.number().min(-180).max(180);

// Location schema
export const locationSchema = z.object({
  postcode: postcodeSchema,
  address: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  lat: latitudeSchema,
  lng: longitudeSchema,
});

// Money amount schema (in pence/smallest unit)
export const moneySchema = z
  .number()
  .positive('Amount must be positive')
  .multipleOf(0.01, 'Amount must have at most 2 decimal places');

// Verification code schema
export const verificationCodeSchema = z
  .string()
  .length(6, 'Code must be 6 digits')
  .regex(/^\d{6}$/, 'Code must contain only digits');

// Device token schema for push notifications
export const deviceTokenSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  platform: z.enum(['ios', 'android', 'web']),
  deviceId: z.string().optional(),
});

// Type exports
export type PaginationInput = z.infer<typeof paginationSchema>;
export type LocationInput = z.infer<typeof locationSchema>;
export type DeviceTokenInput = z.infer<typeof deviceTokenSchema>;
