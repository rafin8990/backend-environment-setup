import { z } from 'zod';

const createLocationZodSchema = z.object({
  body: z.object({
    name: z.string({ required_error: 'Name is required' }),
    description: z.string().optional().nullable(),
    type: z
      .string({ required_error: 'Type is required' }),
    temperature_controlled: z.boolean({
      required_error: 'Temperature control status is required',
    }),
    default_for_category: z.array(z.number()).optional().nullable(),
  }),
});

const updateLocationZodSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    description: z.string().optional().nullable(),
    type: z
      .string()
      .optional(),
    temperature_controlled: z.boolean().optional(),
    default_for_category: z.array(z.number()).optional().nullable(),
  }),
});

export const LocationValidation = {
  createLocationZodSchema,
  updateLocationZodSchema,
};
