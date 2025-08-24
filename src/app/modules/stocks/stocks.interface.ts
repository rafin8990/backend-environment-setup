export type IStock = {
  id?: number;
  item_id: number;
  location_id: number; // NEW: Required for multi-location support
  physical_stock_count: number; // This supports both integers and floats in TypeScript
  note?: string | null;
  counted_at?: Date | null;
  counted_by?: number | null;
  created_at?: Date;
  updated_at?: Date;
};