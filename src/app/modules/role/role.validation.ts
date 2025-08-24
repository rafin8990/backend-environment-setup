import { z } from 'zod';

const createRoleZodSchema = z.object({
  body: z.object({
    title: z.string({
      required_error: 'Role title is required',
    }),
    description: z.string().optional().nullable(),
    permission_ids: z
      .array(z.number(), {
        required_error: 'permission_ids must be an array of numbers',
      })
      .optional(),
  }),
});

const updateRoleZodSchema = z.object({
  body: z.object({
    title: z.string().optional(),
    description: z.string().optional().nullable(),
    permission_ids: z.array(z.number()).optional(),
  }),
});

export const RoleValidation = {
  createRoleZodSchema,
  updateRoleZodSchema,
};
