import { z } from 'zod';

// Password validation regex: min 8 chars, 1 uppercase, 1 number
const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;

// UK phone number regex
const ukPhoneRegex = /^(\+44|0)7\d{9}$/;

export const registerSchema = z.object({
  email: z.string().email('Invalid email format').toLowerCase().trim(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      passwordRegex,
      'Password must contain at least one uppercase letter and one number'
    ),
  firstName: z
    .string()
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name must be at most 50 characters')
    .trim(),
  lastName: z
    .string()
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name must be at most 50 characters')
    .trim(),
});

export const verifyEmailSchema = z.object({
  code: z.string().length(6, 'Verification code must be 6 digits'),
});

export const resendVerificationSchema = z.object({
  email: z.string().email('Invalid email format').toLowerCase().trim(),
});

export const sendPhoneCodeSchema = z.object({
  phone: z.string().regex(ukPhoneRegex, 'Invalid UK phone number format'),
});

export const verifyPhoneSchema = z.object({
  code: z.string().length(6, 'Verification code must be 6 digits'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email format').toLowerCase().trim(),
  password: z.string().min(1, 'Password is required'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email format').toLowerCase().trim(),
});

export const resetPasswordSchema = z.object({
  code: z.string().length(6, 'Reset code must be 6 digits'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      passwordRegex,
      'Password must contain at least one uppercase letter and one number'
    ),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      passwordRegex,
      'Password must contain at least one uppercase letter and one number'
    ),
});

export const appleAuthSchema = z.object({
  identityToken: z.string().min(1, 'Identity token is required'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

export const googleAuthSchema = z.object({
  idToken: z.string().min(1, 'ID token is required'),
});

// Type exports
export type RegisterInput = z.infer<typeof registerSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;
export type SendPhoneCodeInput = z.infer<typeof sendPhoneCodeSchema>;
export type VerifyPhoneInput = z.infer<typeof verifyPhoneSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type AppleAuthInput = z.infer<typeof appleAuthSchema>;
export type GoogleAuthInput = z.infer<typeof googleAuthSchema>;
