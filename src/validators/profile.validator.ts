import { z } from 'zod';

// Skills
export const addSkillsSchema = z.object({
  skillIds: z.array(z.string().uuid()).min(1, 'At least one skill is required').max(20, 'Maximum 20 skills allowed'),
});

export const setSkillsSchema = z.object({
  skillIds: z.array(z.string().uuid()).max(20, 'Maximum 20 skills allowed'),
});

// Categories
export const addCategoriesSchema = z.object({
  categoryIds: z.array(z.string().uuid()).min(1, 'At least one category is required').max(10, 'Maximum 10 categories allowed'),
});

export const setCategoriesSchema = z.object({
  categoryIds: z.array(z.string().uuid()).max(10, 'Maximum 10 categories allowed'),
});

// Experience
export const createExperienceSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters').max(100, 'Title must be at most 100 characters').trim(),
  company: z.string().min(2, 'Company must be at least 2 characters').max(100, 'Company must be at most 100 characters').trim(),
  description: z.string().max(1000, 'Description must be at most 1000 characters').trim().optional().nullable(),
  startDate: z.string().datetime().or(z.date()),
  endDate: z.string().datetime().or(z.date()).optional().nullable(),
  isCurrent: z.boolean().optional(),
});

export const updateExperienceSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters').max(100, 'Title must be at most 100 characters').trim().optional(),
  company: z.string().min(2, 'Company must be at least 2 characters').max(100, 'Company must be at most 100 characters').trim().optional(),
  description: z.string().max(1000, 'Description must be at most 1000 characters').trim().optional().nullable(),
  startDate: z.string().datetime().or(z.date()).optional(),
  endDate: z.string().datetime().or(z.date()).optional().nullable(),
  isCurrent: z.boolean().optional(),
});

// Portfolio
export const createPortfolioSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters').max(100, 'Title must be at most 100 characters').trim(),
  description: z.string().max(500, 'Description must be at most 500 characters').trim().optional().nullable(),
  imageUrl: z.string().url('Invalid image URL'),
});

export const updatePortfolioSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters').max(100, 'Title must be at most 100 characters').trim().optional(),
  description: z.string().max(500, 'Description must be at most 500 characters').trim().optional().nullable(),
  imageUrl: z.string().url('Invalid image URL').optional(),
});

// Type exports
export type AddSkillsInput = z.infer<typeof addSkillsSchema>;
export type SetSkillsInput = z.infer<typeof setSkillsSchema>;
export type AddCategoriesInput = z.infer<typeof addCategoriesSchema>;
export type SetCategoriesInput = z.infer<typeof setCategoriesSchema>;
export type CreateExperienceInput = z.infer<typeof createExperienceSchema>;
export type UpdateExperienceInput = z.infer<typeof updateExperienceSchema>;
export type CreatePortfolioInput = z.infer<typeof createPortfolioSchema>;
export type UpdatePortfolioInput = z.infer<typeof updatePortfolioSchema>;
