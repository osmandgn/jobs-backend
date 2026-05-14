import { z } from 'zod';

export const platformEnum = z.enum(['ios', 'android', 'web'], {
  message: 'Platform must be "ios", "android", or "web"',
});

export const registerDeviceSchema = z.object({
  token: z
    .string({ message: 'FCM token is required' })
    .min(10, 'Please provide a valid FCM token'),
  platform: platformEnum,
  deviceName: z.string().max(100, 'Device name must be at most 100 characters').optional(),
});

export const updateTokenSchema = z.object({
  oldToken: z
    .string({ message: 'Old token is required' })
    .min(10, 'Please provide a valid FCM token'),
  newToken: z
    .string({ message: 'New token is required' })
    .min(10, 'Please provide a valid FCM token'),
});

export const removeDeviceSchema = z.object({
  token: z
    .string({ message: 'FCM token is required' })
    .min(10, 'Please provide a valid FCM token'),
});

export type RegisterDeviceInput = z.infer<typeof registerDeviceSchema>;
export type UpdateTokenInput = z.infer<typeof updateTokenSchema>;
export type RemoveDeviceInput = z.infer<typeof removeDeviceSchema>;
