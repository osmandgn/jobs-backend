import { z } from 'zod';

export const platformEnum = z.enum(['ios', 'android', 'web'], {
  message: 'Platform "ios", "android" veya "web" olmalıdır',
});

export const registerDeviceSchema = z.object({
  token: z
    .string({ message: 'FCM token gereklidir' })
    .min(10, 'Geçerli bir FCM token giriniz'),
  platform: platformEnum,
  deviceName: z.string().max(100, 'Cihaz adı en fazla 100 karakter olabilir').optional(),
});

export const updateTokenSchema = z.object({
  oldToken: z
    .string({ message: 'Eski token gereklidir' })
    .min(10, 'Geçerli bir FCM token giriniz'),
  newToken: z
    .string({ message: 'Yeni token gereklidir' })
    .min(10, 'Geçerli bir FCM token giriniz'),
});

export const removeDeviceSchema = z.object({
  token: z
    .string({ message: 'FCM token gereklidir' })
    .min(10, 'Geçerli bir FCM token giriniz'),
});

export type RegisterDeviceInput = z.infer<typeof registerDeviceSchema>;
export type UpdateTokenInput = z.infer<typeof updateTokenSchema>;
export type RemoveDeviceInput = z.infer<typeof removeDeviceSchema>;
