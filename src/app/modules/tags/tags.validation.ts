import { z } from 'zod';

const createTagZodSchema = z.object({
  body: z.object({
    name: z.string({ required_error: 'Tag name is required' }),
    description: z.string().optional().nullable(),
  }),
});

const updateTagZodSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    description: z.string().optional().nullable(),
  }),
});

export const TagValidation = {
  createTagZodSchema,
  updateTagZodSchema,
};
