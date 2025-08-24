import { z } from 'zod';

const orderItemSchema = z.object({
  item_id: z.number({ required_error: 'Item ID is required' }),
  quantity: z.union([
    z.number({ required_error: 'Quantity is required' }),
    z.string().transform((val) => {
      const parsed = parseFloat(val);
      if (isNaN(parsed)) throw new Error('Invalid quantity');
      return parsed;
    })
  ]).refine((val) => val > 0, {
    message: 'Quantity must be a positive number'
  }),
});

const createOrderZodSchema = z.object({
  body: z.object({
    status: z.string({ required_error: 'Status is required' }),
    order_items: z.array(orderItemSchema).min(1, 'At least one order item is required'),
    approver_id: z.number().optional(),
  }),
});

const updateOrderZodSchema = z.object({
  body: z.object({
    status: z.string().optional(),
    order_items: z.array(orderItemSchema).optional(),
    approver_id: z.number().optional(),
  }),
});

export const OrderValidation = {
  createOrderZodSchema,
  updateOrderZodSchema,
};