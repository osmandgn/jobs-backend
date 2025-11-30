import { z } from 'zod';

// Send message schema
export const sendMessageSchema = z.object({
  content: z
    .string()
    .min(1, { message: 'Mesaj boş olamaz' })
    .max(2000, { message: 'Mesaj en fazla 2000 karakter olabilir' })
    .trim(),
});

// Conversation ID param schema
export const conversationIdSchema = z.object({
  id: z.string().uuid({ message: 'Geçersiz conversation ID' }),
});

// Message ID param schema
export const messageIdSchema = z.object({
  messageId: z.string().uuid({ message: 'Geçersiz message ID' }),
});

// Get messages query schema
export const getMessagesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
  before: z.string().datetime().optional(), // For cursor-based pagination
  after: z.string().datetime().optional(),
});

// Get conversations query schema
export const getConversationsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
});

// Types
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type GetMessagesQuery = z.infer<typeof getMessagesQuerySchema>;
export type GetConversationsQuery = z.infer<typeof getConversationsQuerySchema>;
