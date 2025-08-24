import { z } from 'zod';

export const createStockTransferSchema = z.object({
  transfer_number: z.string().min(1, 'Transfer number is required'),
  source_location_id: z.number().positive('Source location ID must be positive'),
  destination_location_id: z.number().positive('Destination location ID must be positive'),
  transfer_type: z.enum(['manual', 'requisition_fulfillment', 'production_output', 'replenishment', 'po_distribution'], {
    errorMap: () => ({ message: 'Invalid transfer type' })
  }),
  purchase_order_id: z.number().positive().optional().nullable(),
  requisition_id: z.number().positive().optional().nullable(),
  notes: z.string().optional(),
  created_by: z.number().positive().optional(),
  approved_by: z.number().positive().optional(),
  updated_by: z.number().positive().optional(),
  items: z.array(z.object({
    item_id: z.number().positive('Item ID must be positive'),
    quantity_requested: z.number().positive('Quantity requested must be positive'),
    quantity_dispatched: z.number().min(0, 'Quantity dispatched cannot be negative').default(0),
    quantity_received: z.number().min(0, 'Quantity received cannot be negative').default(0),
    unit: z.string().min(1, 'Unit is required'),
    batch_number: z.string().optional().nullable(),
    expiry_date: z.string().optional().nullable(),
    cost_per_unit: z.number().min(0, 'Cost per unit cannot be negative').optional().nullable(),
    notes: z.string().optional()
  })).min(1, 'At least one item is required')
});

export const updateStockTransferSchema = z.object({
  status: z.enum(['pending', 'approved', 'dispatched', 'in_transit', 'received', 'cancelled']).optional(),
  transfer_type: z.enum(['manual', 'requisition_fulfillment', 'production_output', 'replenishment', 'po_distribution']).optional(),
  purchase_order_id: z.number().positive().optional().nullable(),
  requisition_id: z.number().positive().optional().nullable(),
  notes: z.string().optional(),
  approved_by: z.number().positive().optional(),
  updated_by: z.number().positive().optional(),
  dispatched_at: z.string().optional().nullable(),
  received_at: z.string().optional().nullable(),
  items: z.array(z.object({
    id: z.number().positive().optional(),
    item_id: z.number().positive('Item ID is required'),
    quantity_requested: z.number().positive().optional(),
    quantity_dispatched: z.number().min(0).optional(),
    quantity_received: z.number().min(0).optional(),
    unit: z.string().optional(),
    batch_number: z.string().optional().nullable(),
    expiry_date: z.string().optional().nullable(),
    cost_per_unit: z.number().min(0).optional().nullable(),
    notes: z.string().optional()
  })).optional()
});

export const stockTransferFiltersSchema = z.object({
  searchTerm: z.string().optional(),
  source_location_id: z.number().positive().optional(),
  destination_location_id: z.number().positive().optional(),
  status: z.string().optional(),
  transfer_type: z.string().optional(),
  purchase_order_id: z.number().positive().optional(),
  requisition_id: z.number().positive().optional(),
  created_by: z.number().positive().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional()
});
