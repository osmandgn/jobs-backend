/**
 * Auth Validation Schemas
 */

import { z } from 'zod';
import {
  emailSchema,
  phoneSchema,
  passwordSchema,
  nameSchema,
  verificationCodeSchema,
  postcodeSchema,
  latitudeSchema,
  longitudeSchema,
} from './common.schema';

// Register schema
export const registerSchema = z.object({
  body: z.object({
    email: emailSchema,
    phone: phoneSchema,
    password: passwordSchema,
    firstName: nameSchema,
    lastName: nameSchema,
    dateOfBirth: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
      .refine((date) => {
        const dob = new Date(date);
        const age = (Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
        return age >= 16;
      }, 'You must be at least 16 years old')
      .optional(),
    locationPostcode: postcodeSchema.optional(),
    locationLat: latitudeSchema.optional(),
    locationLng: longitudeSchema.optional(),
    marketingConsent: z.boolean().default(false),
    termsAccepted: z.literal(true, {
      message: 'You must accept the terms and conditions',
    }),
  }),
});

// Login schema
export const loginSchema = z.object({
  body: z.object({
    email: emailSchema,
    password: z.string().min(1, 'Password is required'),
  }),
});

// Verify email schema
export const verifyEmailSchema = z.object({
  body: z.object({
    email: emailSchema,
    code: verificationCodeSchema,
  }),
});

// Resend verification schema
export const resendVerificationSchema = z.object({
  body: z.object({
    email: emailSchema,
  }),
});

// Forgot password schema
export const forgotPasswordSchema = z.object({
  body: z.object({
    email: emailSchema,
  }),
});

// Reset password schema
export const resetPasswordSchema = z.object({
  body: z.object({
    email: emailSchema,
    code: verificationCodeSchema,
    newPassword: passwordSchema,
  }),
});

// Change password schema
export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordSchema,
  }),
});

// Refresh token schema
export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
  }),
});

// Social login schema
export const socialLoginSchema = z.object({
  body: z.object({
    provider: z.enum(['apple', 'google']),
    token: z.string().min(1, 'Token is required'),
    firstName: nameSchema.optional(),
    lastName: nameSchema.optional(),
  }),
});

// Verify phone schema
export const verifyPhoneSchema = z.object({
  body: z.object({
    phone: phoneSchema.unwrap(),
    code: verificationCodeSchema,
  }),
});

// Request phone verification schema
export const requestPhoneVerificationSchema = z.object({
  body: z.object({
    phone: phoneSchema.unwrap(),
  }),
});

// Type exports
export type RegisterInput = z.infer<typeof registerSchema>['body'];
export type LoginInput = z.infer<typeof loginSchema>['body'];
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>['body'];
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>['body'];
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>['body'];
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>['body'];
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>['body'];
export type SocialLoginInput = z.infer<typeof socialLoginSchema>['body'];
