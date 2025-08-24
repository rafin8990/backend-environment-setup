export type IRecipeIngrediant = {
  id?: number;
  recipe_id: number;
  ingredient_id: number;
  quantity?: number | null;
  quantity_unit?: string | null;
  note?: string | null;
  is_optional?: boolean | null;
  substitute_ids?: number | null;
  image?: string | null;
  created_at?: Date;
  updated_at?: Date;
};

// Note: Paginated API responses use IGenericResponse<IRecipeIngrediant[]> from '../../interfaces/common'
