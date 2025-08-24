import { z } from 'zod';

const createStockZodSchema = z.object({
  body: z.object({
    item_id: z.number({
      required_error: 'Item ID is required',
    }),
    location_id: z.number({
      required_error: 'Location ID is required',
    }),
    physical_stock_count: z.number({
      required_error: 'Physical stock count is required',
    }).refine((val) => val >= 0, {
      message: 'Physical stock count must be a positive number',
    }),
    note: z.string().optional().nullable(),
    counted_at: z.string().datetime().optional().nullable(),
    counted_by: z.number().optional().nullable(),
  }),
});

const updateStockZodSchema = z.object({
  body: z.object({
    item_id: z.number().optional(),
    location_id: z.number().optional(),
    physical_stock_count: z.number().optional().refine((val) => val === undefined || val >= 0, {
      message: 'Physical stock count must be a positive number',
    }),
    note: z.string().optional().nullable(),
    counted_at: z.string().datetime().optional().nullable(),
    counted_by: z.number().optional().nullable(),
  }),
});

const bulkCreateStockZodSchema = z.object({
  body: z.object({
    stocks: z.array(z.object({
      item_id: z.number({
        required_error: 'Item ID is required',
      }),
      location_id: z.number({
        required_error: 'Location ID is required',
      }),
      physical_stock_count: z.number({
        required_error: 'Physical stock count is required',
      }).refine((val) => val >= 0, {
        message: 'Physical stock count must be a positive number',
      }),
      note: z.string().optional().nullable(),
      counted_at: z.string().datetime().optional().nullable(),
      counted_by: z.number().optional().nullable(),
    })).min(1, 'At least one stock record is required').max(100, 'Maximum 100 records allowed per bulk operation'),
  }),
});

const bulkUpdateStockZodSchema = z.object({
  body: z.object({
    stocks: z.array(z.object({
      id: z.number({
        required_error: 'Stock ID is required for update',
      }),
      item_id: z.number().optional(),
      location_id: z.number().optional(),
      physical_stock_count: z.number().optional().refine((val) => val === undefined || val >= 0, {
        message: 'Physical stock count must be a positive number',
      }),
      note: z.string().optional().nullable(),
      counted_at: z.string().datetime().optional().nullable(),
      counted_by: z.number().optional().nullable(),
    })).min(1, 'At least one stock record is required').max(100, 'Maximum 100 records allowed per bulk operation'),
  }),
});

export const StockValidation = {
  createStockZodSchema,
  updateStockZodSchema,
  bulkCreateStockZodSchema,
  bulkUpdateStockZodSchema,
};
