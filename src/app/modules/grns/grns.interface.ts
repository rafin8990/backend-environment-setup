export type IGRN = {
  id?: number;
  grn_number: string;
  batch_id?: string;
  purchase_order_id?: number | null;
  received_at: string;
  destination_location_id: number;
  status: 'received' | 'partial' | 'rejected';
  invoice_number?: string | null;
  delivery_notes?: string | null;
  attachments?: string[];
  subtotal_amount: number;
  discount_amount: number;
  total_amount: number;
  receiver_id?: number | null;
  is_direct_grn: boolean;
  created_at?: string;
  updated_at?: string;
  purchase_order?: any;
  destination_location?: any;
  receiver?: any;
  items?: IGRNItem[];
};

export type IGRNItem = {
  id?: number;
  grn_id: number;
  item_id: number;
  quantity_expected?: number | null;
  quantity_received: number;
  batch_number?: string | null;
  expiry_date?: string | null;
  type: 'perishable' | 'non_perishable';
  grn_type: 'grn' | 'direct';
  reject_reason?: string | null;
  notes?: string | null;
  expected_unit_cost?: number | null;
  expected_total_cost?: number | null;
  unit_cost: number;
  total_cost: number;
  created_at?: string;
  updated_at?: string;
  item?: any;
};

export type IGRNCreate = Omit<IGRN, 'id' | 'created_at' | 'updated_at' | 'batch_id'> & {
  items: Omit<IGRNItem, 'id' | 'grn_id' | 'created_at' | 'updated_at'>[];
};

export type IGRNUpdate = Partial<Omit<IGRN, 'id' | 'grn_number' | 'purchase_order_id' | 'is_direct_grn' | 'created_at'>>;

export type IGRNFilters = {
  searchTerm?: string;
  batch_id?: string;
  purchase_order_id?: number;
  destination_location_id?: number;
  status?: string;
  receiver_id?: number;
  start_date?: string;
  end_date?: string;
};
