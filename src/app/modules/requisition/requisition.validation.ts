import { z } from 'zod';

const createRequisitionItemZodSchema = z.object({
  item_id: z.number({ required_error: 'Item ID is required' }),
  quantity_expected: z.number().optional().nullable(),
  unit: z.string({ required_error: 'Unit is required' }),
});

const createRequisitionZodSchema = z.object({
  body: z.object({
    source_location_id: z.number({ required_error: 'Source location ID is required' }),
    delivery_location_id: z.number({ required_error: 'Delivery location ID is required' }),
    created_by: z.number().optional().nullable(),
    items: z.array(createRequisitionItemZodSchema, {
      required_error: 'Items array is required',
    }).min(1, 'At least one item is required'),
  }),
});

const updateRequisitionItemZodSchema = z.object({
  item_id: z.number({ required_error: 'Item ID is required' }),
  quantity_expected: z.number().optional().nullable(),
  quantity_received: z.number().optional().nullable(),
  unit: z.string({ required_error: 'Unit is required' }),
});

const updateRequisitionZodSchema = z.object({
  body: z.object({
    source_location_id: z.number().optional(),
    status: z.enum(['pending', 'approved', 'received']).optional(),
    delivery_location_id: z.number().optional(),
    items: z.array(updateRequisitionItemZodSchema).optional(),
  }),
});

const markRequisitionAsReceivedZodSchema = z.object({
  body: z.object({
    items_received: z.array(z.object({
      item_id: z.number({ required_error: 'Item ID is required' }),
      quantity_received: z.number({ required_error: 'Quantity received is required' }),
      unit: z.string({ required_error: 'Unit is required' }),
    }), { required_error: 'Items received array is required' }).min(1, 'At least one item is required'),
  }),
});

export const RequisitionValidation = {
  createRequisitionZodSchema,
  updateRequisitionZodSchema,
  markRequisitionAsReceivedZodSchema,
};
