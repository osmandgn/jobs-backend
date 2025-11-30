import { prisma } from '../config/database';
import { EmailFrequency } from '@prisma/client';

export interface NotificationPreferences {
  newJobPush: boolean;
  newJobEmail: boolean;
  newJobEmailFrequency: EmailFrequency;
  applicationPush: boolean;
  applicationEmail: boolean;
  messagePush: boolean;
  reviewPush: boolean;
  reviewEmail: boolean;
  marketingEmail: boolean;
}

const defaultPreferences: NotificationPreferences = {
  newJobPush: true,
  newJobEmail: true,
  newJobEmailFrequency: 'daily',
  applicationPush: true,
  applicationEmail: true,
  messagePush: true,
  reviewPush: true,
  reviewEmail: true,
  marketingEmail: false,
};

/**
 * Get user's notification preferences
 */
export async function getPreferences(userId: string): Promise<NotificationPreferences> {
  const prefs = await prisma.notificationPreference.findUnique({
    where: { userId },
  });

  if (!prefs) {
    return defaultPreferences;
  }

  return {
    newJobPush: prefs.newJobPush,
    newJobEmail: prefs.newJobEmail,
    newJobEmailFrequency: prefs.newJobEmailFrequency,
    applicationPush: prefs.applicationPush,
    applicationEmail: prefs.applicationEmail,
    messagePush: prefs.messagePush,
    reviewPush: prefs.reviewPush,
    reviewEmail: prefs.reviewEmail,
    marketingEmail: prefs.marketingEmail,
  };
}

/**
 * Update user's notification preferences
 */
export async function updatePreferences(
  userId: string,
  updates: Partial<NotificationPreferences>
): Promise<NotificationPreferences> {
  const prefs = await prisma.notificationPreference.upsert({
    where: { userId },
    update: updates,
    create: {
      userId,
      ...defaultPreferences,
      ...updates,
    },
  });

  return {
    newJobPush: prefs.newJobPush,
    newJobEmail: prefs.newJobEmail,
    newJobEmailFrequency: prefs.newJobEmailFrequency,
    applicationPush: prefs.applicationPush,
    applicationEmail: prefs.applicationEmail,
    messagePush: prefs.messagePush,
    reviewPush: prefs.reviewPush,
    reviewEmail: prefs.reviewEmail,
    marketingEmail: prefs.marketingEmail,
  };
}

/**
 * Check if user wants push notification for a specific type
 */
export async function shouldSendPush(
  userId: string,
  notificationType: 'new_job' | 'application' | 'message' | 'review'
): Promise<boolean> {
  const prefs = await getPreferences(userId);

  switch (notificationType) {
    case 'new_job':
      return prefs.newJobPush;
    case 'application':
      return prefs.applicationPush;
    case 'message':
      return prefs.messagePush;
    case 'review':
      return prefs.reviewPush;
    default:
      return true;
  }
}

/**
 * Check if user wants email notification for a specific type
 */
export async function shouldSendEmail(
  userId: string,
  notificationType: 'new_job' | 'application' | 'review' | 'marketing'
): Promise<boolean> {
  const prefs = await getPreferences(userId);

  switch (notificationType) {
    case 'new_job':
      return prefs.newJobEmail;
    case 'application':
      return prefs.applicationEmail;
    case 'review':
      return prefs.reviewEmail;
    case 'marketing':
      return prefs.marketingEmail;
    default:
      return true;
  }
}

/**
 * Get users who want instant job emails
 */
export async function getUsersWithInstantJobEmails(): Promise<string[]> {
  const prefs = await prisma.notificationPreference.findMany({
    where: {
      newJobEmail: true,
      newJobEmailFrequency: 'instant',
    },
    select: { userId: true },
  });

  return prefs.map((p) => p.userId);
}

/**
 * Get users who want daily job digest
 */
export async function getUsersWithDailyDigest(): Promise<string[]> {
  const prefs = await prisma.notificationPreference.findMany({
    where: {
      newJobEmail: true,
      newJobEmailFrequency: 'daily',
    },
    select: { userId: true },
  });

  return prefs.map((p) => p.userId);
}

/**
 * Get users who want weekly job digest
 */
export async function getUsersWithWeeklyDigest(): Promise<string[]> {
  const prefs = await prisma.notificationPreference.findMany({
    where: {
      newJobEmail: true,
      newJobEmailFrequency: 'weekly',
    },
    select: { userId: true },
  });

  return prefs.map((p) => p.userId);
}

export default {
  getPreferences,
  updatePreferences,
  shouldSendPush,
  shouldSendEmail,
  getUsersWithInstantJobEmails,
  getUsersWithDailyDigest,
  getUsersWithWeeklyDigest,
};
