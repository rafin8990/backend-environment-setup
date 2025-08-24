export type IStockTransfer = {
  id?: number;
  transfer_number: string;
  source_location_id: number;
  destination_location_id: number;
  status: 'pending' | 'approved' | 'dispatched' | 'in_transit' | 'received' | 'cancelled';
  transfer_type: 'manual' | 'requisition_fulfillment' | 'production_output' | 'replenishment' | 'po_distribution';
  purchase_order_id?: number | null;
  requisition_id?: number | null;
  notes?: string | null;
  created_by?: number | null;
  approved_by?: number | null;
  updated_by?: number | null;
  dispatched_at?: string | null;
  received_at?: string | null;
  created_at?: string;
  updated_at?: string;
  purchase_order?: any;
  requisition?: any;
  source_location?: any;
  destination_location?: any;
  creator?: any;
  approver?: any;
  updater?: any;
  items?: IStockTransferItem[];
};

export type IStockTransferItem = {
  id?: number;
  stock_transfer_id?: number;
  item_id: number;
  quantity_requested?: number;
  quantity_dispatched?: number;
  quantity_received?: number;
  unit?: string;
  batch_number?: string | null;
  expiry_date?: string | null;
  cost_per_unit?: number | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
  item?: any;
};

export type IStockTransferCreate = Omit<IStockTransfer, 'id' | 'created_at' | 'updated_at' | 'status'> & {
  status?: 'pending' | 'approved' | 'dispatched' | 'in_transit' | 'received' | 'cancelled';
  items: Omit<IStockTransferItem, 'id' | 'created_at' | 'updated_at'>[];
};

export type IStockTransferUpdate = Partial<Omit<IStockTransfer, 'id' | 'transfer_number' | 'created_at' | 'created_by'>>;

export type IStockTransferFilters = {
  searchTerm?: string;
  source_location_id?: number;
  destination_location_id?: number;
  status?: string;
  transfer_type?: string;
  purchase_order_id?: number;
  requisition_id?: number;
  created_by?: number;
  start_date?: string;
  end_date?: string;
};
