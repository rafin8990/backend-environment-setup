import { z } from 'zod';

const createCategoryZodSchema = z.object({
  body: z.object({
    name: z.string({
      required_error: 'Category name is required',
    }),
    parent_category_id: z.number().optional().nullable(),
    type_id: z.number().optional().nullable(),
    image: z.string().url('Image must be a valid URL').optional().nullable(),
    description: z.string().optional().nullable(),
  }),
});

const updateCategoryZodSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    parent_category_id: z.number().optional().nullable(),
    type_id: z.number().optional().nullable(),
    image: z.string().url('Image must be a valid URL').optional().nullable(),
    description: z.string().optional().nullable(),
  }),
});

export const CategoryValidation = {
  createCategoryZodSchema,
  updateCategoryZodSchema,
};
