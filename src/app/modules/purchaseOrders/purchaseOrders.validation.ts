import { z } from 'zod';

const createPurchaseOrderItemZodSchema = z.object({
  item_id: z.number({
    required_error: 'Item ID is required',
  }),
  quantity: z.number({
    required_error: 'Quantity is required',
  }).refine((val) => val > 0, {
    message: 'Quantity must be greater than 0',
  }),
  unit: z.string({
    required_error: 'Unit is required',
  }),
  unit_price: z.number({
    required_error: 'Unit price is required',
  }).refine((val) => val >= 0, {
    message: 'Unit price must be greater than or equal to 0',
  }),
  total_price: z.number({
    required_error: 'Total price is required',
  }).refine((val) => val >= 0, {
    message: 'Total price must be greater than or equal to 0',
  }),
  delivery_location_id: z.number({
    required_error: 'Delivery location ID is required',
  }),
  requisition_item_ids: z.array(z.number()).optional().default([]),
});

const createPODeliveryLocationZodSchema = z.object({
  location_id: z.number({
    required_error: 'Location ID is required',
  }),
  delivery_address: z.string().optional().nullable(),
  expected_delivery_date: z.string().optional().nullable(),
});

const createPurchaseOrderZodSchema = z.object({
  body: z.object({
    po_number: z.string({
      required_error: 'PO number is required',
    }),
    supplier_id: z.number({
      required_error: 'Supplier ID is required',
    }),
    order_type: z.enum(['direct', 'consolidated', 'requisition_based'], {
      required_error: 'Order type is required',
    }),
    delivery_type: z.enum(['single_location', 'multiple_locations'], {
      required_error: 'Delivery type is required',
    }),
    expected_delivery_date: z.string({
      required_error: 'Expected delivery date is required',
    }),
    central_delivery_location_id: z.number().optional().nullable(),
    notes: z.string().optional().nullable(),
    total_amount: z.number({
      required_error: 'Total amount is required',
    }).refine((val) => val >= 0, {
      message: 'Total amount must be greater than or equal to 0',
    }),
    created_by: z.number().optional().nullable(),
    items: z.array(createPurchaseOrderItemZodSchema, {
      required_error: 'Items array is required',
    }).min(1, 'At least one item is required'),
    delivery_locations: z.array(createPODeliveryLocationZodSchema).optional(),
  }).refine((data) => {
    // Validate delivery type logic
    if (data.delivery_type === 'multiple_locations' && (!data.delivery_locations || data.delivery_locations.length === 0)) {
      return false;
    }
    if (data.delivery_type === 'single_location' && !data.central_delivery_location_id) {
      return false;
    }
    return true;
  }, {
    message: 'Invalid delivery type configuration',
  }),
});

const updatePurchaseOrderZodSchema = z.object({
  body: z.object({
    po_number: z.string().optional(),
    supplier_id: z.number().optional(),
    order_type: z.enum(['direct', 'consolidated', 'requisition_based']).optional(),
    delivery_type: z.enum(['single_location', 'multiple_locations']).optional(),
    expected_delivery_date: z.string().optional(),
    central_delivery_location_id: z.number().optional().nullable(),
    notes: z.string().optional().nullable(),
    status: z.enum(['pending', 'approved', 'ordered', 'partially_received', 'completed', 'cancelled']).optional(),
    total_amount: z.number().optional(),
    created_by: z.number().optional().nullable(),
    items: z.array(createPurchaseOrderItemZodSchema).optional(),
    delivery_locations: z.array(createPODeliveryLocationZodSchema).optional(),
  }).refine((data) => {
    // Validate delivery type logic if both are provided
    if (data.delivery_type && data.delivery_locations) {
      if (data.delivery_type === 'multiple_locations' && data.delivery_locations.length === 0) {
        return false;
      }
      if (data.delivery_type === 'single_location' && !data.central_delivery_location_id) {
        return false;
      }
    }
    return true;
  }, {
    message: 'Invalid delivery type configuration',
  }),
});

const updatePurchaseOrderStatusZodSchema = z.object({
  body: z.object({
    status: z.enum(['pending', 'approved', 'ordered', 'partially_received', 'completed', 'cancelled'], {
      required_error: 'Status is required',
    }),
    approved_by: z.number().optional().nullable(),
  }),
});

export const PurchaseOrderValidation = {
  createPurchaseOrderZodSchema,
  updatePurchaseOrderZodSchema,
  updatePurchaseOrderStatusZodSchema,
};
