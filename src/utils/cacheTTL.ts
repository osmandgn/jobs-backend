// Cache TTL values in seconds
export const CACHE_TTL = {
  // Short-lived (1-5 minutes)
  USER_PROFILE: 5 * 60, // 5 minutes
  USER_STATS: 5 * 60, // 5 minutes
  REVIEW_STATS: 5 * 60, // 5 minutes
  NOTIFICATION_PREFS: 5 * 60, // 5 minutes

  // Medium-lived (10-30 minutes)
  JOB_DETAIL: 2 * 60, // 2 minutes
  JOB_LIST: 1 * 60, // 1 minute
  SETTINGS: 30 * 60, // 30 minutes

  // Long-lived (1 hour+)
  CATEGORIES: 60 * 60, // 1 hour
  SKILLS: 60 * 60, // 1 hour
  POPULAR_CATEGORIES: 60 * 60, // 1 hour

  // Very long (24 hours)
  POSTCODE_LOOKUP: 24 * 60 * 60, // 24 hours

  // View debounce
  VIEW_DEBOUNCE: 60 * 60, // 1 hour
} as const;

export type CacheTTLKey = keyof typeof CACHE_TTL;

export default CACHE_TTL;
