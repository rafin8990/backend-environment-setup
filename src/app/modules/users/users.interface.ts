export type IUser = {
  id?: number;
  name: string;
  email: string;
  userName: string;
  phoneNumber?: string;
  address?: string;
  organizationId: number;
  password: string;
  image?: string;
  status: 'active' | 'suspended' | 'inactive';
  role: number;
  created_at?: Date;
  updated_at?: Date;
};
