export type IRequisition = {
  id?: number;
  source_location_id: number;
  status: 'pending' | 'approved' | 'received';
  requisition_date: string;
  delivery_location_id: number;
  created_by?: number | null;
  created_at?: string;
  updated_at?: string;
  items?: IRequisitionItem[];
  source_location?: any;
  delivery_location?: any;
};

export type IRequisitionItem = {
  id?: number;
  requisition_id: number;
  item_id: number;
  quantity_expected?: number | null;
  quantity_received?: number | null;
  unit: string;
  created_at?: string;
  updated_at?: string;
};

export type IRequisitionCreateRequest = {
  requisition_number?: string;
  requisition_type?: string;
  priority?: string;
  expected_delivery_date?: string;
  source_location_id: number;
  delivery_location_id: number;
  notes?: string;
  items: Array<{
    item_id: number;
    quantity_requested: number;
    unit: string;
    estimated_cost?: number;
    notes?: string | null;
  }>;
  created_by?: number | null;
  status?: string;
};

export type IRequisitionUpdateRequest = {
  source_location_id?: number;
  status?: 'pending' | 'approved' | 'received';
  delivery_location_id?: number;
  items?: Array<{
    item_id: number;
    quantity_expected?: number | null;
    quantity_received?: number | null;
    unit: string;
  }>;
};

export type IRequisitionFilters = {
  searchTerm?: string;
  status?: string;
  source_location_id?: number;
  created_by?: number;
  created_at?: string;
  start_date?: string;
  end_date?: string;
};

export type IRequisitionItemReceived = {
  item_id: number;
  quantity_received: number;
  unit: string;
};

export type IRequisitionReceiveRequest = {
  items_received: IRequisitionItemReceived[];
};
