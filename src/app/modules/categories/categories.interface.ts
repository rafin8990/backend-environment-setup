export type ICategory = {
  id?: number;
  name: string;
  parent_category_id?: number | null;
  type_id?: number | null;
  image?: string | null;           // Add this
  description?: string | null;     // Add this
  created_at?: Date;
  updated_at?: Date;
  parent_category?: any;
  type?: any;
  sub_category?: any[];
};