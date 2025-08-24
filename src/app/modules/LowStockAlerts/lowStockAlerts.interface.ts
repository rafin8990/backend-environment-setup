export type ILowStockAlert = {
  id?: string;
  item_id: string;
  current_stock: number;
  min_stock_threshold: number;
  alert_created_at?: Date;
  resolved: boolean;
  notes?: string | null;
};