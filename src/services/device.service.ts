import { prisma } from '../config/database';
import { DevicePlatform } from '@prisma/client';
import logger from '../utils/logger';

export interface RegisterDeviceInput {
  userId: string;
  token: string;
  platform: DevicePlatform;
  deviceName?: string;
}

export interface UpdateTokenInput {
  oldToken: string;
  newToken: string;
}

/**
 * Register a device token for push notifications
 */
export async function registerDevice(input: RegisterDeviceInput): Promise<void> {
  const { userId, token, platform, deviceName } = input;

  // Upsert: varsa güncelle, yoksa oluştur
  await prisma.deviceToken.upsert({
    where: { token },
    update: {
      userId,
      platform,
      deviceName,
      lastUsedAt: new Date(),
    },
    create: {
      userId,
      token,
      platform,
      deviceName,
    },
  });

  logger.info('Device token registered', { userId, platform });
}

/**
 * Remove a device token (usually on logout)
 */
export async function removeDevice(token: string): Promise<void> {
  await prisma.deviceToken.deleteMany({
    where: { token },
  });

  logger.info('Device token removed');
}

/**
 * Remove all devices for a user (logout from all devices)
 */
export async function removeAllUserDevices(userId: string): Promise<number> {
  const result = await prisma.deviceToken.deleteMany({
    where: { userId },
  });

  logger.info('All device tokens removed for user', { userId, count: result.count });
  return result.count;
}

/**
 * Update device token (token refresh)
 */
export async function updateDeviceToken(input: UpdateTokenInput): Promise<boolean> {
  const { oldToken, newToken } = input;

  const existingDevice = await prisma.deviceToken.findUnique({
    where: { token: oldToken },
  });

  if (!existingDevice) {
    return false;
  }

  // Eski token'ı yeni token ile güncelle
  await prisma.deviceToken.update({
    where: { token: oldToken },
    data: {
      token: newToken,
      lastUsedAt: new Date(),
    },
  });

  logger.info('Device token updated', { userId: existingDevice.userId });
  return true;
}

/**
 * Get all device tokens for a user
 */
export async function getUserDevices(userId: string): Promise<
  {
    id: string;
    token: string;
    platform: DevicePlatform;
    deviceName: string | null;
    lastUsedAt: Date;
    createdAt: Date;
  }[]
> {
  return prisma.deviceToken.findMany({
    where: { userId },
    select: {
      id: true,
      token: true,
      platform: true,
      deviceName: true,
      lastUsedAt: true,
      createdAt: true,
    },
    orderBy: { lastUsedAt: 'desc' },
  });
}

/**
 * Get device tokens for multiple users
 */
export async function getDeviceTokensForUsers(userIds: string[]): Promise<
  {
    userId: string;
    token: string;
    platform: DevicePlatform;
  }[]
> {
  return prisma.deviceToken.findMany({
    where: { userId: { in: userIds } },
    select: {
      userId: true,
      token: true,
      platform: true,
    },
  });
}

/**
 * Remove invalid/expired tokens
 */
export async function removeInvalidTokens(tokens: string[]): Promise<number> {
  if (tokens.length === 0) {
    return 0;
  }

  const result = await prisma.deviceToken.deleteMany({
    where: { token: { in: tokens } },
  });

  logger.info('Invalid device tokens removed', { count: result.count });
  return result.count;
}

/**
 * Update last used time for a token
 */
export async function touchDeviceToken(token: string): Promise<void> {
  await prisma.deviceToken.updateMany({
    where: { token },
    data: { lastUsedAt: new Date() },
  });
}

/**
 * Remove stale tokens (not used for a long time)
 */
export async function removeStaleTokens(daysOld: number = 90): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  const result = await prisma.deviceToken.deleteMany({
    where: {
      lastUsedAt: { lt: cutoffDate },
    },
  });

  logger.info('Stale device tokens removed', { count: result.count, daysOld });
  return result.count;
}

export default {
  registerDevice,
  removeDevice,
  removeAllUserDevices,
  updateDeviceToken,
  getUserDevices,
  getDeviceTokensForUsers,
  removeInvalidTokens,
  touchDeviceToken,
  removeStaleTokens,
};
