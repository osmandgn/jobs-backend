// Cache key prefixes
export const CACHE_PREFIXES = {
  USER: 'user',
  USER_PROFILE: 'user:profile',
  USER_STATS: 'user:stats',
  JOB: 'job',
  JOB_DETAIL: 'job:detail',
  JOB_LIST: 'job:list',
  CATEGORIES: 'categories',
  CATEGORY: 'category',
  SKILLS: 'skills',
  SETTINGS: 'settings',
  NOTIFICATION_PREFS: 'notification:prefs',
  REVIEW_STATS: 'review:stats',
  BLACKLIST: 'blacklist',
  VIEW: 'view',
  RATE_LIMIT: 'rl',
} as const;

// Cache key generators
export const cacheKeys = {
  // User keys
  userProfile: (userId: string): string => `${CACHE_PREFIXES.USER_PROFILE}:${userId}`,
  userStats: (userId: string): string => `${CACHE_PREFIXES.USER_STATS}:${userId}`,
  userById: (userId: string): string => `${CACHE_PREFIXES.USER}:${userId}`,

  // User namespace (for service compatibility)
  user: {
    profile: (userId: string): string => `${CACHE_PREFIXES.USER_PROFILE}:${userId}`,
    stats: (userId: string): string => `${CACHE_PREFIXES.USER_STATS}:${userId}`,
    byId: (userId: string): string => `${CACHE_PREFIXES.USER}:${userId}`,
  },

  // Job keys
  jobDetail: (jobId: string): string => `${CACHE_PREFIXES.JOB_DETAIL}:${jobId}`,
  jobList: (queryHash: string): string => `${CACHE_PREFIXES.JOB_LIST}:${queryHash}`,
  jobsByCategory: (categoryId: string): string => `${CACHE_PREFIXES.JOB}:category:${categoryId}`,
  jobsByUser: (userId: string): string => `${CACHE_PREFIXES.JOB}:user:${userId}`,

  // Category keys
  allCategories: (): string => `${CACHE_PREFIXES.CATEGORIES}:all`,
  categoryTree: (): string => `${CACHE_PREFIXES.CATEGORIES}:tree`,
  categoryBySlug: (slug: string): string => `${CACHE_PREFIXES.CATEGORY}:slug:${slug}`,
  categoryById: (id: string): string => `${CACHE_PREFIXES.CATEGORY}:id:${id}`,
  popularCategories: (): string => `${CACHE_PREFIXES.CATEGORIES}:popular`,

  // Skills keys
  allSkills: (): string => `${CACHE_PREFIXES.SKILLS}:all`,
  skillsByCategory: (categoryId: string): string =>
    `${CACHE_PREFIXES.SKILLS}:category:${categoryId}`,

  // Settings keys
  allSettings: (): string => `${CACHE_PREFIXES.SETTINGS}:all`,
  setting: (key: string): string => `${CACHE_PREFIXES.SETTINGS}:${key}`,

  // Settings namespace (for service compatibility)
  settings: {
    all: (): string => `${CACHE_PREFIXES.SETTINGS}:all`,
    byKey: (key: string): string => `${CACHE_PREFIXES.SETTINGS}:${key}`,
  },

  // Notification preferences
  notificationPrefs: (userId: string): string =>
    `${CACHE_PREFIXES.NOTIFICATION_PREFS}:${userId}`,

  // Review stats
  reviewStats: (userId: string): string => `${CACHE_PREFIXES.REVIEW_STATS}:${userId}`,

  // Token blacklist
  blacklistToken: (token: string): string => `${CACHE_PREFIXES.BLACKLIST}:${token}`,

  // View tracking
  jobView: (jobId: string, userId: string | null): string =>
    userId
      ? `${CACHE_PREFIXES.VIEW}:job:${jobId}:user:${userId}`
      : `${CACHE_PREFIXES.VIEW}:job:${jobId}:anon`,
};

// Pattern generators for invalidation
export const cachePatterns = {
  allUserKeys: (userId: string): string => `*:${userId}`,
  allJobKeys: (jobId: string): string => `*job*:${jobId}*`,
  allCategoryKeys: (): string => `${CACHE_PREFIXES.CATEGORIES}:*`,
  allSkillKeys: (): string => `${CACHE_PREFIXES.SKILLS}:*`,
  allSettingsKeys: (): string => `${CACHE_PREFIXES.SETTINGS}:*`,
};

export default cacheKeys;
