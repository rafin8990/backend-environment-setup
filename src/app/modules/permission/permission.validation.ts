import { z } from 'zod';

const createPermissionZodSchema = z.object({
  body: z.object({
    title: z.string({
      required_error: 'Permission title is required',
    }),
    description: z.string().optional().nullable(),
  }),
});

const updatePermissionZodSchema = z.object({
  body: z.object({
    title: z.string().optional(),
    description: z.string().optional().nullable(),
  }),
});

export const PermissionValidation = {
  createPermissionZodSchema,
  updatePermissionZodSchema,
};
