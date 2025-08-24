import { z } from 'zod';

const createOrganizationZodSchema = z.object({
  body: z.object({
    name: z.string({
      required_error: 'Organization name is required',
    }),
    domain: z.string({
      required_error: 'Domain is required',
    }),
    address: z.string({
      required_error: 'Address is required',
    }),
  }),
});

const updateOrganizationZodSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    domain: z.string().optional(),
    address: z.string().optional(),
  }),
});

export const OrganizationValidation = {
  createOrganizationZodSchema,
  updateOrganizationZodSchema,
};
