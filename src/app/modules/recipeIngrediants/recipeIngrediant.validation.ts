import { z } from 'zod';

const createRecipeIngrediantZodSchema = z.object({
  body: z.object({
    recipe_id: z.number({ required_error: 'Recipe ID is required' }),
    ingredient_id: z.number({ required_error: 'Ingredient ID is required' }),
    quantity: z.number().optional().nullable(),
    quantity_unit: z.string().optional().nullable(),
    note: z.string().optional().nullable(),
    is_optional: z.boolean().optional().nullable(),
    substitute_ids: z.number().optional().nullable(),
    image: z.string().optional().nullable(),
  }),
});

const updateRecipeIngrediantZodSchema = z.object({
  body: z.object({
    recipe_id: z.number().optional(),
    ingredient_id: z.number().optional(),
    quantity: z.number().optional().nullable(),
    quantity_unit: z.string().optional().nullable(),
    note: z.string().optional().nullable(),
    is_optional: z.boolean().optional().nullable(),
    substitute_ids: z.number().optional().nullable(),
    image: z.string().optional().nullable(),
  }),
});

// Note: Pagination query params (page, limit, sortBy, sortOrder) are handled at the controller/service level and not validated here.
export const RecipeIngrediantValidation = {
  createRecipeIngrediantZodSchema,
  updateRecipeIngrediantZodSchema,
};
