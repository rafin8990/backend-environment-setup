import { z } from 'zod';

const createItemZodSchema = z.object({
  body: z.object({
    name: z.string({ required_error: 'Item name is required' }),
    supplier_id: z.number().optional().nullable(),
    type_id: z.number().optional().nullable(),
    category_id: z.number().optional().nullable(),
    location_id: z.number().optional().nullable(),
    description: z.string().optional().nullable(),
    unit: z.string().optional().nullable(),
    image_urls: z.array(z.string()).optional().nullable(),
    stock_quantity: z.number().optional(),
    min_stock: z.number().optional(),
    max_stock: z.number().optional(),
    expiry_date: z.union([z.string(), z.date()]).optional().nullable(),
    cost_per_unit: z.number().optional().nullable(),
    last_restocked: z.union([z.string(), z.date()]).optional().nullable(),
    shelf_life: z.number().optional().nullable(),
    storage_conditions: z.string().optional().nullable(),
    temperature_range: z.string().optional().nullable(),
    humidity_range: z.string().optional().nullable(),
    status: z.enum(['active', 'inactive', 'expired', 'archived']).default('active'),
    batch_tracking_enabled: z.boolean().default(false),
    note: z.string().optional().nullable(),
    tag_ids: z.array(z.number()).optional(),
  }),
});

const updateItemZodSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    supplier_id: z.number().optional().nullable(),
    type_id: z.number().optional().nullable(),
    category_id: z.number().optional().nullable(),
    location_id: z.number().optional().nullable(),
    description: z.string().optional().nullable(),
    unit: z.string().optional().nullable(),
    image_urls: z.array(z.string().url()).optional().nullable(),
    stock_quantity: z.number().optional(),
    min_stock: z.number().optional(),
    max_stock: z.number().optional(),
    expiry_date: z.string().datetime().optional().nullable(),
    cost_per_unit: z.number().optional().nullable(),
    last_restocked: z.string().datetime().optional().nullable(),
    shelf_life: z.number().optional().nullable(),
    storage_conditions: z.string().optional().nullable(),
    temperature_range: z.string().optional().nullable(),
    humidity_range: z.string().optional().nullable(),
    status: z.enum(['active', 'inactive']).optional(),
    batch_tracking_enabled: z.boolean().optional(),
    note: z.string().optional().nullable(),
    tag_ids: z.array(z.number()).optional(),
  }),
});

export const ItemValidation = {
  createItemZodSchema,
  updateItemZodSchema,
};
