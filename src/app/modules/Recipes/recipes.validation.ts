import { z } from 'zod';

const createRecipeZodSchema = z.object({
  body: z.object({
    name: z.string({ required_error: 'Name is required' }),
    category_id: z.number().optional().nullable(),
    yield_quantity: z.string().optional().nullable(),
    yield_unit: z.string().optional().nullable(),
    total_weight: z.string().optional().nullable(),
    tag_ids: z.array(z.number()).optional().nullable(),
    description: z.string().optional().nullable(),
    note: z.string().optional().nullable(),
    instruction: z.string().optional().nullable(),
    estimated_time: z.string().optional().nullable(),
    price: z.number().optional().nullable(),
    recipe_code: z.string().optional().nullable(),
    images: z.array(z.string()).optional().nullable(),
    ingredients: z
      .array(
        z.object({
          ingredient_id: z.number(),
          quantity: z.string().nullable().optional(),
          quantity_unit: z.string().nullable().optional(),
          note: z.string().nullable().optional(),
          is_optional: z.boolean().optional(),
          substitute_ids: z.array(z.number()).optional().nullable(),
        })
      )
      .optional(),
  }),
});

const updateRecipeZodSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    category_id: z.number().optional().nullable(),
    yield_quantity: z.string().optional().nullable(),
    yield_unit: z.string().optional().nullable(),
    total_weight: z.string().optional().nullable(),
    tag_ids: z.array(z.number()).optional().nullable(),
    description: z.string().optional().nullable(),
    note: z.string().optional().nullable(),
    instruction: z.string().optional().nullable(),
    estimated_time: z.string().optional().nullable(),
    price: z.number().optional().nullable(),
    recipe_code: z.string().optional().nullable(),
    images: z.array(z.string()).optional().nullable(),
    ingredients: z
      .array(
        z.object({
          ingredient_id: z.number(),
          quantity: z.string().nullable().optional(),
          quantity_unit: z.string().nullable().optional(),
          note: z.string().nullable().optional(),
          is_optional: z.boolean().optional(),
          substitute_ids: z.array(z.number()).optional().nullable(),
        })
      )
      .optional(),
  }),
});

export const RecipeValidation = {
  createRecipeZodSchema,
  updateRecipeZodSchema,
};
