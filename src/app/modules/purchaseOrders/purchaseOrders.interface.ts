export type IPurchaseOrder = {
  id?: number;
  po_number: string;
  supplier_id: number;
  order_type: 'direct' | 'consolidated' | 'requisition_based';
  delivery_type: 'single_location' | 'multiple_locations';
  expected_delivery_date: string;
  central_delivery_location_id?: number | null;
  notes?: string | null;
  status: 'pending' | 'approved' | 'ordered' | 'partially_received' | 'completed' | 'cancelled';
  total_amount: number;
  created_by?: number | null;
  approved_by?: number | null;
  created_at?: string;
  updated_at?: string;
  supplier?: any;
  items?: IPurchaseOrderItem[];
  delivery_locations?: IPODeliveryLocation[];
};

export type IPurchaseOrderItem = {
  id?: number;
  purchase_order_id?: number;
  item_id: number;
  quantity: number;
  unit: string;
  unit_price: number;
  total_price: number;
  delivery_location_id: number;
  requisition_item_ids: number[];
  created_at?: string;
  updated_at?: string;
  item?: any;
  delivery_location?: any;
};

export type IPODeliveryLocation = {
  id?: number;
  purchase_order_id?: number;
  location_id: number;
  delivery_address?: string | null;
  expected_delivery_date?: string | null;
  created_at?: string;
  location?: any;
};

export type IPurchaseOrderCreate = Omit<IPurchaseOrder, 'id' | 'created_at' | 'updated_at' | 'status'> & {
  status?: 'pending' | 'approved' | 'ordered' | 'partially_received' | 'completed' | 'cancelled';
  items: Omit<IPurchaseOrderItem, 'id' | 'purchase_order_id' | 'created_at' | 'updated_at'>[];
  delivery_locations?: Omit<IPODeliveryLocation, 'id' | 'purchase_order_id' | 'created_at'>[];
};

export type IPurchaseOrderUpdate = Partial<Omit<IPurchaseOrder, 'id' | 'po_number' | 'supplier_id' | 'created_by' | 'created_at'>>;

export type IPurchaseOrderFilters = {
  searchTerm?: string;
  supplier_id?: number;
  status?: string;
  order_type?: string;
  delivery_type?: string;
  created_by?: number;
  start_date?: string;
  end_date?: string;
};
