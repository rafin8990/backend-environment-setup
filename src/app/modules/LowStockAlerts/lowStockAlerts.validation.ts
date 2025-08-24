import { z } from 'zod';

const createLowStockAlertZodSchema = z.object({
  body: z.object({
    item_id: z.number({ required_error: 'Item ID is required' }),
    current_stock: z.number({ required_error: 'Current stock is required' }),
    min_stock_threshold: z.number({ required_error: 'Minimum stock threshold is required' }),
    resolved: z.boolean().optional().default(false),
    notes: z.string().optional().nullable(),
  }),
});

const updateLowStockAlertZodSchema = z.object({
  body: z.object({
    resolved: z.boolean().optional(),
    notes: z.string().optional().nullable(),
  }).strict(),
});

export const LowStockAlertValidation = {
  createLowStockAlertZodSchema,
  updateLowStockAlertZodSchema,
};