export type IStockMovement = {
  id?: number;
  item_id: number;
  location_id: number;
  movement_type: 'purchase' | 'sale' | 'transfer_in' | 'transfer_out' | 'adjustment' | 'physical_count';
  quantity: number;
  reference_type: 'purchase_entry' | 'order' | 'stock_transfer' | 'adjustment' | 'physical_count';
  reference_id: number;
  previous_quantity: number;
  new_quantity: number;
  unit_cost?: number | null;
  notes?: string | null;
  created_by?: number | null;
  created_at?: Date;
};

export type IStockMovementCreate = Omit<IStockMovement, 'id' | 'created_at'>;
