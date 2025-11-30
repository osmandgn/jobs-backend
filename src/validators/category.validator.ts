import { z } from 'zod';

// Create category schema (Admin)
export const createCategorySchema = z.object({
  name: z
    .string()
    .min(2, 'Kategori adı en az 2 karakter olmalıdır')
    .max(100, 'Kategori adı en fazla 100 karakter olabilir'),
  slug: z
    .string()
    .min(2, 'Slug en az 2 karakter olmalıdır')
    .max(100, 'Slug en fazla 100 karakter olabilir')
    .regex(/^[a-z0-9-]+$/, 'Slug sadece küçük harf, rakam ve tire içerebilir')
    .optional(),
  icon: z.string().max(50, 'İkon adı en fazla 50 karakter olabilir').optional(),
  description: z.string().max(500, 'Açıklama en fazla 500 karakter olabilir').optional(),
  parentId: z.string().uuid('Geçersiz üst kategori ID').optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(1000).optional(),
});

// Update category schema (Admin)
export const updateCategorySchema = z.object({
  name: z
    .string()
    .min(2, 'Kategori adı en az 2 karakter olmalıdır')
    .max(100, 'Kategori adı en fazla 100 karakter olabilir')
    .optional(),
  slug: z
    .string()
    .min(2, 'Slug en az 2 karakter olmalıdır')
    .max(100, 'Slug en fazla 100 karakter olabilir')
    .regex(/^[a-z0-9-]+$/, 'Slug sadece küçük harf, rakam ve tire içerebilir')
    .optional(),
  icon: z.string().max(50, 'İkon adı en fazla 50 karakter olabilir').nullable().optional(),
  description: z.string().max(500, 'Açıklama en fazla 500 karakter olabilir').nullable().optional(),
  parentId: z.string().uuid('Geçersiz üst kategori ID').nullable().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(1000).optional(),
});

// Reorder categories schema (Admin)
export const reorderCategoriesSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().uuid('Geçersiz kategori ID'),
        sortOrder: z.number().int().min(0).max(1000),
      })
    )
    .min(1, 'En az bir kategori gereklidir'),
});

// Category ID/Slug parameter
export const categoryIdOrSlugSchema = z.object({
  idOrSlug: z.string().min(1, 'Kategori ID veya slug gereklidir'),
});

// Category ID parameter
export const categoryIdSchema = z.object({
  id: z.string().uuid('Geçersiz kategori ID'),
});

// Types
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type ReorderCategoriesInput = z.infer<typeof reorderCategoriesSchema>;
