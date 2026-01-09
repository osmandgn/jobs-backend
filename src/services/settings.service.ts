import { prisma } from '../config/database';
import { cacheService } from './cache.service';
import { cacheKeys } from '../utils/cacheKeys';
import { CACHE_TTL } from '../utils/cacheTTL';
import logger from '../utils/logger';

export type SettingValueType = 'string' | 'number' | 'boolean' | 'json';

interface SystemSetting {
  key: string;
  value: string;
  description: string | null;
  updatedAt: Date;
  updatedBy: string | null;
}

interface ParsedSetting {
  key: string;
  value: string | number | boolean | Record<string, unknown>;
  rawValue: string;
  description: string | null;
  updatedAt: Date;
  updatedBy: string | null;
}

// Default settings with types
const SETTING_TYPES: Record<string, SettingValueType> = {
  job_requires_approval: 'boolean',
  max_images_per_job: 'number',
  review_window_days: 'number',
  job_expiry_days: 'number',
  featured_job_price: 'number',
  min_pay_amount: 'number',
  max_pay_amount: 'number',
  min_password_length: 'number',
  max_applications_per_day: 'number',
  max_report_evidence: 'number',
  maintenance_mode: 'boolean',
  maintenance_message: 'string',
  max_skills_per_user: 'number',
  max_categories_per_user: 'number',
  max_portfolio_items: 'number',
  notification_radius_default: 'number',
  notification_radius_max: 'number',
  account_deletion_delay_days: 'number',
  unverified_cleanup_days: 'number',
  message_max_length: 'number',
  bio_max_length: 'number',
  // App version settings
  min_app_version_ios: 'string',
  min_app_version_android: 'string',
  force_update_message: 'string',
  app_store_url: 'string',
  play_store_url: 'string',
};

// Default values
const DEFAULT_SETTINGS: Record<string, string> = {
  job_requires_approval: 'true',
  max_images_per_job: '5',
  review_window_days: '14',
  job_expiry_days: '30',
  featured_job_price: '9.99',
  min_pay_amount: '10',
  max_pay_amount: '10000',
  min_password_length: '8',
  max_applications_per_day: '20',
  max_report_evidence: '5',
  maintenance_mode: 'false',
  maintenance_message: '',
  max_skills_per_user: '30',
  max_categories_per_user: '10',
  max_portfolio_items: '10',
  notification_radius_default: '10',
  notification_radius_max: '50',
  account_deletion_delay_days: '30',
  unverified_cleanup_days: '30',
  message_max_length: '2000',
  bio_max_length: '500',
  // App version defaults
  min_app_version_ios: '1.0.0',
  min_app_version_android: '1.0.0',
  force_update_message: 'A new version of GigHub is available. Please update to continue using the app.',
  app_store_url: 'https://apps.apple.com/app/gighub-uk/id123456789',
  play_store_url: 'https://play.google.com/store/apps/details?id=uk.gighub.app',
};

/**
 * Parse setting value based on its type
 */
function parseValue(key: string, value: string): string | number | boolean | Record<string, unknown> {
  const type = SETTING_TYPES[key] || 'string';

  switch (type) {
    case 'boolean':
      return value === 'true';
    case 'number':
      return parseInt(value, 10);
    case 'json':
      try {
        return JSON.parse(value) as Record<string, unknown>;
      } catch {
        return {};
      }
    default:
      return value;
  }
}

/**
 * Get all system settings (cached)
 */
export async function getAllSettings(): Promise<Record<string, ParsedSetting>> {
  const cacheKey = cacheKeys.settings.all();

  // Try cache first
  const cached = await cacheService.get<Record<string, ParsedSetting>>(cacheKey);
  if (cached) {
    return cached;
  }

  // Fetch from database
  const settings = await prisma.systemSetting.findMany();

  // Build result with defaults
  const result: Record<string, ParsedSetting> = {};

  // Add defaults first
  for (const [key, defaultValue] of Object.entries(DEFAULT_SETTINGS)) {
    result[key] = {
      key,
      value: parseValue(key, defaultValue),
      rawValue: defaultValue,
      description: null,
      updatedAt: new Date(),
      updatedBy: null,
    };
  }

  // Override with database values
  for (const setting of settings) {
    result[setting.key] = {
      key: setting.key,
      value: parseValue(setting.key, setting.value),
      rawValue: setting.value,
      description: setting.description,
      updatedAt: setting.updatedAt,
      updatedBy: setting.updatedBy,
    };
  }

  // Cache result
  await cacheService.set(cacheKey, result, CACHE_TTL.SETTINGS);

  return result;
}

/**
 * Get a single setting value (with type)
 */
export async function getSetting<T = string | number | boolean>(key: string): Promise<T> {
  const settings = await getAllSettings();
  const setting = settings[key];

  if (setting) {
    return setting.value as T;
  }

  // Return default if exists
  const defaultValue = DEFAULT_SETTINGS[key];
  if (defaultValue !== undefined) {
    return parseValue(key, defaultValue) as T;
  }

  throw new Error(`Setting not found: ${key}`);
}

/**
 * Get a single setting with full details
 */
export async function getSettingDetail(key: string): Promise<ParsedSetting | null> {
  const settings = await getAllSettings();
  return settings[key] || null;
}

/**
 * Update a setting
 */
export async function updateSetting(
  key: string,
  value: string,
  adminId: string
): Promise<ParsedSetting> {
  // Validate key exists in defaults (known setting)
  if (!DEFAULT_SETTINGS.hasOwnProperty(key)) {
    // Allow custom settings but log warning
    logger.warn(`Updating unknown setting: ${key}`);
  }

  // Validate value type if known
  const type = SETTING_TYPES[key];
  if (type) {
    if (type === 'boolean' && value !== 'true' && value !== 'false') {
      throw new Error(`Setting ${key} must be 'true' or 'false'`);
    }
    if (type === 'number' && isNaN(parseInt(value, 10))) {
      throw new Error(`Setting ${key} must be a number`);
    }
    if (type === 'json') {
      try {
        JSON.parse(value);
      } catch {
        throw new Error(`Setting ${key} must be valid JSON`);
      }
    }
  }

  // Upsert setting
  const setting = await prisma.systemSetting.upsert({
    where: { key },
    update: {
      value,
      updatedBy: adminId,
      updatedAt: new Date(),
    },
    create: {
      key,
      value,
      description: null,
      updatedBy: adminId,
    },
  });

  // Invalidate cache
  await cacheService.del(cacheKeys.settings.all());

  logger.info(`Setting updated: ${key}`, { adminId, value });

  return {
    key: setting.key,
    value: parseValue(setting.key, setting.value),
    rawValue: setting.value,
    description: setting.description,
    updatedAt: setting.updatedAt,
    updatedBy: setting.updatedBy,
  };
}

/**
 * Get multiple settings at once (efficient)
 */
export async function getSettings(keys: string[]): Promise<Record<string, unknown>> {
  const allSettings = await getAllSettings();
  const result: Record<string, unknown> = {};

  for (const key of keys) {
    if (allSettings[key]) {
      result[key] = allSettings[key].value;
    } else if (DEFAULT_SETTINGS[key]) {
      result[key] = parseValue(key, DEFAULT_SETTINGS[key]);
    }
  }

  return result;
}

/**
 * Helper to check if maintenance mode is enabled
 */
export async function isMaintenanceMode(): Promise<boolean> {
  return getSetting<boolean>('maintenance_mode');
}

/**
 * Helper to get maintenance message
 */
export async function getMaintenanceMessage(): Promise<string> {
  return getSetting<string>('maintenance_message');
}

/**
 * Reload settings cache
 */
export async function reloadSettings(): Promise<void> {
  await cacheService.del(cacheKeys.settings.all());
  await getAllSettings();
  logger.info('Settings cache reloaded');
}

/**
 * Initialize default settings in database
 */
export async function initializeDefaultSettings(): Promise<void> {
  const existingSettings = await prisma.systemSetting.findMany({
    select: { key: true },
  });

  const existingKeys = new Set(existingSettings.map((s) => s.key));

  const missingSettings = Object.entries(DEFAULT_SETTINGS).filter(
    ([key]) => !existingKeys.has(key)
  );

  if (missingSettings.length > 0) {
    await prisma.systemSetting.createMany({
      data: missingSettings.map(([key, value]) => ({
        key,
        value,
        description: `Default setting for ${key}`,
      })),
      skipDuplicates: true,
    });

    logger.info(`Initialized ${missingSettings.length} default settings`);
  }
}

export const settingsService = {
  getAllSettings,
  getSetting,
  getSettingDetail,
  updateSetting,
  getSettings,
  isMaintenanceMode,
  getMaintenanceMessage,
  reloadSettings,
  initializeDefaultSettings,
};

export default settingsService;
