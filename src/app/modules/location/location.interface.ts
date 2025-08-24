export type IStorageLocation = {
  id: string;
  name: string;
  description: string;
  type: 'Warehouse' | 'Refrigerator' | string;
  temperature_controlled: boolean;
  default_for_category: number[];
  contact_number: string;
  address?: string;
  storage_capacity: number;
  storage_capacity_unit: 'kg' | 'g' | 'ml' | 'l' | 'pcs' | string;
  asset_ids?: number[];
  created_at?: Date;
  updated_at?: Date;
};
