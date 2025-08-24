import { z } from 'zod';

const createTypeZodSchema = z.object({
  body: z.object({
    name: z.string({ required_error: 'Name is required' }),
    parent_type_id: z.number().optional().nullable(),
  }),
});

const updateTypeZodSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    parent_type_id: z.number().optional().nullable(),
  }),
});

export const TypeValidation = {
  createTypeZodSchema,
  updateTypeZodSchema,
};
