export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface JwtPayload {
  userId: string;
  email: string;
  role: 'user' | 'admin';
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload {
  userId: string;
  tokenId: string;
  iat?: number;
  exp?: number;
}

export type UserStatus = 'active' | 'suspended' | 'banned' | 'deleted';
export type UserRole = 'user' | 'admin';
export type JobStatus =
  | 'draft'
  | 'pending_review'
  | 'active'
  | 'paused'
  | 'filled'
  | 'completed'
  | 'expired'
  | 'rejected';
export type PayType = 'hourly' | 'fixed';
export type ExperienceLevel = 'entry' | 'intermediate' | 'expert';
export type ApplicationStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn';
export type ReviewType = 'employer_to_worker' | 'worker_to_employer';
export type ReportReason =
  | 'spam'
  | 'fraud'
  | 'harassment'
  | 'inappropriate'
  | 'fake_listing'
  | 'misleading'
  | 'other';
export type ReportStatus = 'pending' | 'investigating' | 'resolved' | 'dismissed';
export type NotificationType =
  | 'new_job_match'
  | 'application_received'
  | 'application_accepted'
  | 'application_rejected'
  | 'new_message'
  | 'new_review'
  | 'job_reminder'
  | 'system';
export type DevicePlatform = 'ios' | 'android' | 'web';
export type VerificationType = 'email' | 'phone' | 'password_reset';
export type EmailFrequency = 'instant' | 'daily' | 'weekly';
