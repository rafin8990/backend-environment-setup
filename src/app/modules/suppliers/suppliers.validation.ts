import { z } from 'zod';

const createSupplierZodSchema = z.object({
  body: z.object({
    name: z.string({ required_error: 'Name is required' }),
    description: z.string().optional().nullable(),
    contact_person: z.string().optional().nullable(),
    email: z.string().email().optional().nullable(),
    phone: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    country: z.string().optional().nullable(),
    tax_id: z.string().optional().nullable(),
    payment_terms: z.string().optional().nullable(),
    credit_limit: z.number().optional().nullable(),
    current_balance: z.number().optional().nullable(),
    status: z.enum(['active', 'inactive', 'blacklisted']).optional(),
    rating: z.number().min(1).max(5).optional().nullable(),
    notes: z.string().optional().nullable(),
  }),
});

const updateSupplierZodSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    description: z.string().optional().nullable(),
    contact_person: z.string().optional().nullable(),
    email: z.string().email().optional().nullable(),
    phone: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    country: z.string().optional().nullable(),
    tax_id: z.string().optional().nullable(),
    payment_terms: z.string().optional().nullable(),
    credit_limit: z.number().optional().nullable(),
    current_balance: z.number().optional().nullable(),
    status: z.enum(['active', 'inactive', 'blacklisted']).optional(),
    rating: z.number().min(1).max(5).optional().nullable(),
    notes: z.string().optional().nullable(),
  }),
});

export const SupplierValidation = {
  createSupplierZodSchema,
  updateSupplierZodSchema,
};