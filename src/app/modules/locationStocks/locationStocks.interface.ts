export type ILocationStock = {
  id?: number;
  location_id: number;
  item_id: number;
  available_quantity: number;
  reserved_quantity: number;
  allocated_quantity: number;
  min_stock: number;
  max_stock: number;
  last_updated?: Date;
  created_at?: Date;
  updated_at?: Date;
};

export type ILocationStockCreate = Omit<ILocationStock, 'id' | 'created_at' | 'updated_at'>;
export type ILocationStockUpdate = Partial<Omit<ILocationStock, 'id' | 'created_at' | 'updated_at'>>;
