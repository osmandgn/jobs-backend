import { z } from 'zod';

// Create skill schema (Admin)
export const createSkillSchema = z.object({
  name: z
    .string()
    .min(2, 'Beceri adı en az 2 karakter olmalıdır')
    .max(100, 'Beceri adı en fazla 100 karakter olabilir'),
  slug: z
    .string()
    .min(2, 'Slug en az 2 karakter olmalıdır')
    .max(100, 'Slug en fazla 100 karakter olabilir')
    .regex(/^[a-z0-9-]+$/, 'Slug sadece küçük harf, rakam ve tire içerebilir')
    .optional(),
  categoryId: z.string().uuid('Geçersiz kategori ID'),
});

// Update skill schema (Admin)
export const updateSkillSchema = z.object({
  name: z
    .string()
    .min(2, 'Beceri adı en az 2 karakter olmalıdır')
    .max(100, 'Beceri adı en fazla 100 karakter olabilir')
    .optional(),
  slug: z
    .string()
    .min(2, 'Slug en az 2 karakter olmalıdır')
    .max(100, 'Slug en fazla 100 karakter olabilir')
    .regex(/^[a-z0-9-]+$/, 'Slug sadece küçük harf, rakam ve tire içerebilir')
    .optional(),
  categoryId: z.string().uuid('Geçersiz kategori ID').optional(),
});

// Bulk create skills schema (Admin)
export const bulkCreateSkillsSchema = z.object({
  categoryId: z.string().uuid('Geçersiz kategori ID'),
  skillNames: z
    .array(
      z
        .string()
        .min(2, 'Beceri adı en az 2 karakter olmalıdır')
        .max(100, 'Beceri adı en fazla 100 karakter olabilir')
    )
    .min(1, 'En az bir beceri adı gereklidir')
    .max(50, 'Bir seferde en fazla 50 beceri eklenebilir'),
});

// Move skills schema (Admin)
export const moveSkillsSchema = z.object({
  skillIds: z
    .array(z.string().uuid('Geçersiz beceri ID'))
    .min(1, 'En az bir beceri ID gereklidir'),
  targetCategoryId: z.string().uuid('Geçersiz hedef kategori ID'),
});

// Skill ID parameter
export const skillIdSchema = z.object({
  id: z.string().uuid('Geçersiz beceri ID'),
});

// Category ID query parameter
export const skillsByCategoryQuerySchema = z.object({
  categoryId: z.string().uuid('Geçersiz kategori ID').optional(),
});

// Types
export type CreateSkillInput = z.infer<typeof createSkillSchema>;
export type UpdateSkillInput = z.infer<typeof updateSkillSchema>;
export type BulkCreateSkillsInput = z.infer<typeof bulkCreateSkillsSchema>;
export type MoveSkillsInput = z.infer<typeof moveSkillsSchema>;
