import { z } from 'zod';

const createPurchaseEntryItemZodSchema = z.object({
  item_id: z.number({
    required_error: 'Item ID is required',
  }),
  quantity: z.number({
    required_error: 'Quantity is required',
  }).refine((val) => val > 0, {
    message: 'Quantity must be greater than 0',
  }),
  quantity_expected: z.number().optional(),
  quantity_received: z.number().optional(),
  expected: z.number().optional(),
  unit: z.string().optional(),
  price: z.number().optional().refine((val) => !val || val >= 0, {
    message: 'Price must be greater than or equal to 0',
  }),
  notes: z.string().optional(),
  requisition_code: z.string().optional(),
  batch_number: z.string().optional(),
  expiry_date: z.string().optional(),
  storage_location: z.string().optional(),
  quality_check: z.enum(['pending', 'passed', 'failed']).default('pending'),
});

const createPurchaseEntryZodSchema = z.object({
  body: z.object({
    pe_number: z.string({
      required_error: 'PE number is required',
    }),
    po_id: z.number().optional().nullable(),
    grn_id: z.number().optional().nullable(),
    amount_paid: z.number({
      required_error: 'Amount paid is required',
    }).refine((val) => val > 0, {
      message: 'Amount paid must be greater than 0',
    }),
    payment_status: z.enum(['pending', 'partial', 'completed'], {
      required_error: 'Payment status is required',
    }),
    payment_method: z.string().optional().nullable(),
    payment_reference: z.string().optional().nullable(),
    attachments: z.array(z.string()).optional().default([]),
    created_by: z.number().optional().nullable(),
    is_direct_pe: z.boolean().default(false),
    items: z.array(createPurchaseEntryItemZodSchema).optional().default([]),
  }).refine((data) => {
    // Either PO or GRN must be provided, unless it's a direct PE
    if (!data.is_direct_pe && !data.po_id && !data.grn_id) {
      return false;
    }
    return true;
  }, {
    message: 'Either PO ID or GRN ID must be provided for non-direct purchase entries',
  }),
});

const updatePurchaseEntryZodSchema = z.object({
  body: z.object({
    amount_paid: z.number().optional(),
    payment_status: z.enum(['pending', 'partial', 'completed']).optional(),
    payment_method: z.string().optional().nullable(),
    payment_reference: z.string().optional().nullable(),
    attachments: z.array(z.string()).optional(),
  }),
});

const updatePaymentStatusZodSchema = z.object({
  body: z.object({
    payment_status: z.enum(['pending', 'partial', 'completed'], {
      required_error: 'Payment status is required',
    }),
    payment_method: z.string().optional().nullable(),
    payment_reference: z.string().optional().nullable(),
  }),
});

// New validation schema for GRN-based PE creation
const createPEFromGRNZodSchema = z.object({
  body: z.object({
    grnId: z.number({
      required_error: 'GRN ID is required',
    }),
    amountPaid: z.number({
      required_error: 'Amount paid is required',
    }).refine((val) => val > 0, {
      message: 'Amount paid must be greater than 0',
    }),
    paymentStatus: z.enum(['pending', 'partial', 'completed'], {
      required_error: 'Payment status is required',
    }),
    paymentMethod: z.string().optional().nullable(),
    paymentReference: z.string().optional().nullable(),
    notes: z.string().optional(),
    created_by: z.number().optional().nullable(),
  }),
});

// New validation schema for PO-based PE creation
const createPEFromPOZodSchema = z.object({
  body: z.object({
    poId: z.number({
      required_error: 'Purchase order ID is required',
    }),
    amountPaid: z.number({
      required_error: 'Amount paid is required',
    }),
    paymentStatus: z.enum(['pending', 'partial', 'completed'], {
      required_error: 'Payment status is required',
    }),
    paymentMethod: z.string().optional().nullable(),
    paymentReference: z.string().optional().nullable(),
    notes: z.string().optional(),
    created_by: z.number().optional().nullable(),
  }),
});

export const PurchaseEntryValidation = {
  createPurchaseEntryZodSchema,
  updatePurchaseEntryZodSchema,
  updatePaymentStatusZodSchema,
  createPEFromGRNZodSchema,
  createPEFromPOZodSchema,
};
