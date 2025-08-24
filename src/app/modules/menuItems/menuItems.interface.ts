export type MenuItem = {
  id?: number;
  title: string;
  url?: string | null;
  icon?: string | null;
  parent_id?: number | null;
  order?: number;
  created_at?: Date;
  updated_at?: Date;
  children?: MenuItem[];
  parent?: MenuItem | null;
};