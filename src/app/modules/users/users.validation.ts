import { z } from 'zod';

const createUserZodSchema = z.object({
  body: z.object({
    name: z.string({
      required_error: 'Name is required',
    }),
    email: z
      .string({
        required_error: 'Email is required',
      })
      .email('Invalid email format'),
    userName: z.string({
      required_error: 'Username is required',
    }),
    phoneNumber: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
    organizationId: z.number({
      required_error: 'Organization ID is required',
    }),
    password: z.string({
      required_error: 'Password is required',
    }),
    image: z.string().url('Image must be a valid URL').optional().nullable(),
    status: z.enum(['active', 'suspended', 'inactive'], {
      required_error: 'Status is required',
    }),
    role: z.number({
      required_error: 'Role ID is required',
    }),
  }),
});

const updateUserZodSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    email: z.string().email('Invalid email format').optional(),
    userName: z.string().optional(),
    phoneNumber: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
    organizationId: z.number().optional(),
    password: z.string().optional(),
    image: z.string().url('Image must be a valid URL').optional().nullable(),
    status: z.enum(['active', 'suspended', 'inactive']).optional(),
    role: z.number().optional(),
  }),
});

export const UserValidation = {
  createUserZodSchema,
  updateUserZodSchema,
};
