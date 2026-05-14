import { z } from 'zod';

// Create category schema (Admin)
export const createCategorySchema = z.object({
  name: z
    .string()
    .min(2, 'Category name must be at least 2 characters')
    .max(100, 'Category name must be at most 100 characters'),
  slug: z
    .string()
    .min(2, 'Slug must be at least 2 characters')
    .max(100, 'Slug must be at most 100 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens')
    .optional(),
  icon: z.string().max(50, 'Icon name must be at most 50 characters').optional(),
  description: z.string().max(500, 'Description must be at most 500 characters').optional(),
  parentId: z.string().uuid('Invalid parent category ID').optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(1000).optional(),
});

// Update category schema (Admin)
export const updateCategorySchema = z.object({
  name: z
    .string()
    .min(2, 'Category name must be at least 2 characters')
    .max(100, 'Category name must be at most 100 characters')
    .optional(),
  slug: z
    .string()
    .min(2, 'Slug must be at least 2 characters')
    .max(100, 'Slug must be at most 100 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens')
    .optional(),
  icon: z.string().max(50, 'Icon name must be at most 50 characters').nullable().optional(),
  description: z.string().max(500, 'Description must be at most 500 characters').nullable().optional(),
  parentId: z.string().uuid('Invalid parent category ID').nullable().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(1000).optional(),
});

// Reorder categories schema (Admin)
export const reorderCategoriesSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().uuid('Invalid category ID'),
        sortOrder: z.number().int().min(0).max(1000),
      })
    )
    .min(1, 'At least one category is required'),
});

// Category ID/Slug parameter
export const categoryIdOrSlugSchema = z.object({
  idOrSlug: z.string().min(1, 'Category ID or slug is required'),
});

// Category ID parameter
export const categoryIdSchema = z.object({
  id: z.string().uuid('Invalid category ID'),
});

// Types
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type ReorderCategoriesInput = z.infer<typeof reorderCategoriesSchema>;
