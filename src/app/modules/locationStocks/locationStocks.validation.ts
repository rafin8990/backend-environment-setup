import { z } from 'zod';

const createLocationStockZodSchema = z.object({
  body: z.object({
    location_id: z.number({
      required_error: 'Location ID is required',
    }),
    item_id: z.number({
      required_error: 'Item ID is required',
    }),
    available_quantity: z.number({
      required_error: 'Available quantity is required',
    }).refine((val) => val >= 0, {
      message: 'Available quantity must be a positive number',
    }),
    reserved_quantity: z.number({
      required_error: 'Reserved quantity is required',
    }).refine((val) => val >= 0, {
      message: 'Reserved quantity must be a positive number',
    }),
    allocated_quantity: z.number({
      required_error: 'Allocated quantity is required',
    }).refine((val) => val >= 0, {
      message: 'Allocated quantity must be a positive number',
    }),
    min_stock: z.number({
      required_error: 'Minimum stock is required',
    }).refine((val) => val >= 0, {
      message: 'Minimum stock must be a positive number',
    }),
    max_stock: z.number({
      required_error: 'Maximum stock is required',
    }).refine((val) => val >= 0, {
      message: 'Maximum stock must be a positive number',
    }),
  }),
});

const updateLocationStockZodSchema = z.object({
  body: z.object({
    available_quantity: z.number().optional().refine((val) => val === undefined || val >= 0, {
      message: 'Available quantity must be a positive number',
    }),
    reserved_quantity: z.number().optional().refine((val) => val === undefined || val >= 0, {
      message: 'Reserved quantity must be a positive number',
    }),
    allocated_quantity: z.number().optional().refine((val) => val === undefined || val >= 0, {
      message: 'Allocated quantity must be a positive number',
    }),
    min_stock: z.number().optional().refine((val) => val === undefined || val >= 0, {
      message: 'Minimum stock must be a positive number',
    }),
    max_stock: z.number().optional().refine((val) => val === undefined || val >= 0, {
      message: 'Maximum stock must be a positive number',
    }),
  }),
});

const bulkUpdateLocationStocksZodSchema = z.object({
  body: z.object({
    location_id: z.number({
      required_error: 'Location ID is required',
    }),
    updates: z.array(z.object({
      item_id: z.number({
        required_error: 'Item ID is required',
      }),
      available_quantity: z.number().optional(),
      reserved_quantity: z.number().optional(),
      allocated_quantity: z.number().optional(),
      min_stock: z.number().optional(),
      max_stock: z.number().optional(),
    })).min(1, 'At least one update is required'),
  }),
});

export const LocationStockValidation = {
  createLocationStockZodSchema,
  updateLocationStockZodSchema,
  bulkUpdateLocationStocksZodSchema,
};
