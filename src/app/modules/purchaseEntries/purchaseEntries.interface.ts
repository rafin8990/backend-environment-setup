export type IPurchaseEntryItem = {
  id?: number;
  pe_id?: number;
  item_id: number;
  quantity: number;
  quantity_expected?: number;
  quantity_received?: number;
  expected?: number;
  price?: number;
  unit?: string;
  notes?: string;
  requisition_code?: string;
  batch_number?: string;
  expiry_date?: string;
  storage_location?: string;
  quality_check?: 'pending' | 'passed' | 'failed';
  created_at?: string;
  updated_at?: string;
  item?: any; // For populated item data
};

export type IPurchaseEntry = {
  id?: number;
  pe_number: string;
  po_id?: number | null;
  grn_id?: number | null;
  amount_paid: number;
  payment_status: 'pending' | 'partial' | 'completed';
  payment_method?: string | null;
  payment_reference?: string | null;
  attachments?: string[];
  created_by?: number | null;
  updated_by?: number | null;
  is_direct_pe: boolean;
  created_at?: string;
  updated_at?: string;
  purchase_order?: any;
  grn?: any;
  creator?: any;
  updater?: any;
  items?: IPurchaseEntryItem[]; // Add items array
};

export type IPurchaseEntryCreate = Omit<IPurchaseEntry, 'id' | 'created_at' | 'updated_at' | 'updated_by'> & {
  pe_number: string;
  amount_paid: number;
  payment_status: 'pending' | 'partial' | 'completed';
  is_direct_pe: boolean;
  items?: IPurchaseEntryItem[]; // Add items to create type
};

export type IPurchaseEntryUpdate = Partial<Omit<IPurchaseEntry, 'id' | 'pe_number' | 'po_id' | 'grn_id' | 'is_direct_pe' | 'created_at' | 'created_by'>>;

export type IPurchaseEntryFilters = {
  searchTerm?: string;
  po_id?: number;
  grn_id?: number;
  payment_status?: string;
  created_by?: number;
  start_date?: string;
  end_date?: string;
};
