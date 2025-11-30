// Re-export Prisma enums for use throughout the application
export {
  UserStatus,
  UserRole,
  JobStatus,
  PayType,
  ExperienceLevel,
  ApplicationStatus,
  ReviewType,
  ReportReason,
  ReportStatus,
  NotificationType,
  DevicePlatform,
  VerificationType,
  EmailFrequency,
} from '@prisma/client';

// Type-safe enum values for validation
export const USER_STATUS_VALUES = ['active', 'suspended', 'banned', 'deleted'] as const;
export const USER_ROLE_VALUES = ['user', 'admin'] as const;
export const JOB_STATUS_VALUES = [
  'draft',
  'pending_review',
  'active',
  'paused',
  'filled',
  'completed',
  'expired',
  'rejected',
] as const;
export const PAY_TYPE_VALUES = ['hourly', 'fixed'] as const;
export const EXPERIENCE_LEVEL_VALUES = ['entry', 'intermediate', 'expert'] as const;
export const APPLICATION_STATUS_VALUES = ['pending', 'accepted', 'rejected', 'withdrawn'] as const;
export const REVIEW_TYPE_VALUES = ['employer_to_worker', 'worker_to_employer'] as const;
export const REPORT_REASON_VALUES = [
  'spam',
  'fraud',
  'harassment',
  'inappropriate',
  'fake_listing',
  'misleading',
  'other',
] as const;
export const REPORT_STATUS_VALUES = ['pending', 'investigating', 'resolved', 'dismissed'] as const;
export const NOTIFICATION_TYPE_VALUES = [
  'new_job_match',
  'application_received',
  'application_accepted',
  'application_rejected',
  'new_message',
  'new_review',
  'job_reminder',
  'system',
] as const;
export const DEVICE_PLATFORM_VALUES = ['ios', 'android', 'web'] as const;
export const VERIFICATION_TYPE_VALUES = ['email', 'phone', 'password_reset'] as const;
export const EMAIL_FREQUENCY_VALUES = ['instant', 'daily', 'weekly'] as const;

// Job status transitions
export const JOB_STATUS_TRANSITIONS: Record<string, string[]> = {
  draft: ['pending_review', 'active'],
  pending_review: ['active', 'rejected'],
  active: ['paused', 'filled', 'expired'],
  paused: ['active', 'expired'],
  filled: ['completed'],
  completed: [],
  expired: [],
  rejected: ['draft'],
};

// Application status transitions
export const APPLICATION_STATUS_TRANSITIONS: Record<string, string[]> = {
  pending: ['accepted', 'rejected', 'withdrawn'],
  accepted: [],
  rejected: [],
  withdrawn: [],
};
