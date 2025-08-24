import { z } from 'zod';

const createGRNItemZodSchema = z.object({
  item_id: z.number({
    required_error: 'Item ID is required',
  }),
  quantity_expected: z.number().optional().nullable(),
  quantity_received: z.number({
    required_error: 'Quantity received is required',
  }).refine((val) => val > 0, {
    message: 'Quantity received must be greater than 0',
  }),
  batch_number: z.string().optional().nullable(),
  expiry_date: z.string().optional().nullable(),
  type: z.enum(['perishable', 'non_perishable'], {
    required_error: 'Type is required',
  }),
  grn_type: z.enum(['grn', 'direct']).default('direct'),
  reject_reason: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  expected_unit_cost: z.number().optional().nullable(),
  expected_total_cost: z.number().optional().nullable(),
  unit_cost: z.number({
    required_error: 'Unit cost is required',
  }).refine((val) => val >= 0, {
    message: 'Unit cost must be greater than or equal to 0',
  }),
  total_cost: z.number({
    required_error: 'Total cost is required',
  }).refine((val) => val >= 0, {
    message: 'Total cost must be greater than or equal to 0',
  }),
});

const createGRNZodSchema = z.object({
  body: z.object({
    grn_number: z.string({
      required_error: 'GRN number is required',
    }),
    purchase_order_id: z.number().optional().nullable(),
    received_at: z.string({
      required_error: 'Received at date is required',
    }),
    destination_location_id: z.number({
      required_error: 'Destination location ID is required',
    }),
    status: z.enum(['received', 'partial', 'rejected'], {
      required_error: 'Status is required',
    }),
    invoice_number: z.string().optional().nullable(),
    delivery_notes: z.string().optional().nullable(),
    attachments: z.array(z.string()).optional().default([]),
    subtotal_amount: z.number({
      required_error: 'Subtotal amount is required',
    }).refine((val) => val >= 0, {
      message: 'Subtotal amount must be greater than or equal to 0',
    }),
    discount_amount: z.number({
      required_error: 'Discount amount is required',
    }).refine((val) => val >= 0, {
      message: 'Discount amount must be greater than or equal to 0',
    }),
    total_amount: z.number({
      required_error: 'Total amount is required',
    }).refine((val) => val >= 0, {
      message: 'Total amount must be greater than or equal to 0',
    }),
    receiver_id: z.number().optional().nullable(),
    is_direct_grn: z.boolean().default(false),
    items: z.array(createGRNItemZodSchema, {
      required_error: 'Items array is required',
    }).min(1, 'At least one item is required'),
  }),
});

const updateGRNZodSchema = z.object({
  body: z.object({
    status: z.enum(['received', 'partial', 'rejected']).optional(),
    invoice_number: z.string().optional().nullable(),
    delivery_notes: z.string().optional().nullable(),
    attachments: z.array(z.string()).optional(),
    subtotal_amount: z.number().optional(),
    discount_amount: z.number().optional(),
    total_amount: z.number().optional(),
    receiver_id: z.number().optional().nullable(),
  }),
});

const updateGRNStatusZodSchema = z.object({
  body: z.object({
    status: z.enum(['received', 'partial', 'rejected'], {
      required_error: 'Status is required',
    }),
    receiver_id: z.number().optional().nullable(),
  }),
});

// New validation schema for PO-based GRN creation
const createGRNFromPOZodSchema = z.object({
  body: z.object({
    purchaseOrderId: z.number({
      required_error: 'Purchase order ID is required',
    }),
    receivedAt: z.string({
      required_error: 'Received date is required',
    }),
    destinationLocationId: z.number({
      required_error: 'Destination location ID is required',
    }),
    items: z.array(z.object({
      item_id: z.number({
        required_error: 'Item ID is required',
      }),
      quantity_received: z.number({
        required_error: 'Received quantity is required',
      }).refine((val) => val > 0, {
        message: 'Received quantity must be greater than 0',
      }),
      batch_number: z.string().optional(),
      expiry_date: z.string().optional(),
      type: z.enum(['perishable', 'non_perishable'], {
        required_error: 'Item type is required',
      }),
      reject_reason: z.string().optional(),
      notes: z.string().optional(),
      unit_cost: z.number({
        required_error: 'Unit cost is required',
      }).refine((val) => val >= 0, {
        message: 'Unit cost must be greater than or equal to 0',
      }),
      total_cost: z.number({
        required_error: 'Total cost is required',
      }).refine((val) => val >= 0, {
        message: 'Total cost must be greater than or equal to 0',
      }),
    })).min(1, {
      message: 'At least one item is required',
    }),
    receiverId: z.number().optional().nullable(),
    notes: z.string().optional(),
  }),
});

export const GRNValidation = {
  createGRNZodSchema,
  updateGRNZodSchema,
  updateGRNStatusZodSchema,
  createGRNFromPOZodSchema,
};
