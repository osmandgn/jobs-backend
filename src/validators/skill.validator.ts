import { z } from 'zod';

// Create skill schema (Admin)
export const createSkillSchema = z.object({
  name: z
    .string()
    .min(2, 'Skill name must be at least 2 characters')
    .max(100, 'Skill name must be at most 100 characters'),
  slug: z
    .string()
    .min(2, 'Slug must be at least 2 characters')
    .max(100, 'Slug must be at most 100 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens')
    .optional(),
  categoryId: z.string().uuid('Invalid category ID'),
});

// Update skill schema (Admin)
export const updateSkillSchema = z.object({
  name: z
    .string()
    .min(2, 'Skill name must be at least 2 characters')
    .max(100, 'Skill name must be at most 100 characters')
    .optional(),
  slug: z
    .string()
    .min(2, 'Slug must be at least 2 characters')
    .max(100, 'Slug must be at most 100 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens')
    .optional(),
  categoryId: z.string().uuid('Invalid category ID').optional(),
});

// Bulk create skills schema (Admin)
export const bulkCreateSkillsSchema = z.object({
  categoryId: z.string().uuid('Invalid category ID'),
  skillNames: z
    .array(
      z
        .string()
        .min(2, 'Skill name must be at least 2 characters')
        .max(100, 'Skill name must be at most 100 characters')
    )
    .min(1, 'At least one skill name is required')
    .max(50, 'A maximum of 50 skills can be added at once'),
});

// Move skills schema (Admin)
export const moveSkillsSchema = z.object({
  skillIds: z
    .array(z.string().uuid('Invalid skill ID'))
    .min(1, 'At least one skill ID is required'),
  targetCategoryId: z.string().uuid('Invalid target category ID'),
});

// Skill ID parameter
export const skillIdSchema = z.object({
  id: z.string().uuid('Invalid skill ID'),
});

// Category ID query parameter
export const skillsByCategoryQuerySchema = z.object({
  categoryId: z.string().uuid('Invalid category ID').optional(),
});

// Types
export type CreateSkillInput = z.infer<typeof createSkillSchema>;
export type UpdateSkillInput = z.infer<typeof updateSkillSchema>;
export type BulkCreateSkillsInput = z.infer<typeof bulkCreateSkillsSchema>;
export type MoveSkillsInput = z.infer<typeof moveSkillsSchema>;
