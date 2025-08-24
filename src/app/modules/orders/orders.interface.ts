export type IOrder = {
  id?: number;
  status?: string;
  order_items?: IOrderItem[];
  updated_at?: Date;
  created_at?: Date;
  approver_id?: number | null; // references user_id, optional
};

export type IOrderItem = {
  item_id: number;
  quantity: number;
};