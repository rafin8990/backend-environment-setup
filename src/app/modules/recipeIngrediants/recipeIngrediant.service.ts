import httpStatus from 'http-status';
import ApiError from '../../../errors/ApiError';
import { paginationHelpers } from '../../../helpers/paginationHelper';
import { IGenericResponse } from '../../../interfaces/common';
import { IPaginationOptions } from '../../../interfaces/pagination';
import pool from '../../../utils/dbClient';
import { IRecipeIngrediant } from './recipeIngrediant.interface';

const createRecipeIngrediant = async (data: IRecipeIngrediant): Promise<IRecipeIngrediant | null> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const insertQuery = `
        INSERT INTO recipe_ingredients (
          recipe_id, ingredient_id, quantity, quantity_unit,
          note, is_optional, substitute_ids, image
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *;
      `;

    const values = [
      data.recipe_id,
      data.ingredient_id,
      data.quantity ?? null,
      data.quantity_unit ?? null,
      data.note ?? null,
      data.is_optional ?? false,
      data.substitute_ids ?? null,
      data.image ?? null,
    ];

    const result = await client.query(insertQuery, values);
    const recipeIngrediant = result.rows[0];

    await client.query('COMMIT');
    return recipeIngrediant;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const getAllRecipeIngrediants = async (
  filters: any,
  paginationOptions: IPaginationOptions
): Promise<IGenericResponse<any[]>> => {
  const { searchTerm, recipe_id, item_id, ...otherFilters } = filters;
  const {
    page,
    limit,
    skip,
    sortBy = 'created_at',
    sortOrder = 'desc',
  } = paginationHelpers.calculatePagination(paginationOptions);

  const conditions: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (searchTerm) {
    const searchFields = ['i.name', 'i.description'];
    const searchCondition = searchFields
      .map(field => `${field} ILIKE $${paramIndex++}`)
      .join(' OR ');
    values.push(...searchFields.map(() => `%${searchTerm}%`));
    conditions.push(`(${searchCondition})`);
  }

  if (recipe_id) {
    conditions.push(`ri.recipe_id = $${paramIndex}`);
    values.push(recipe_id);
    paramIndex++;
  }

  if (item_id) {
    conditions.push(`ri.ingredient_id = $${paramIndex}`);
    values.push(item_id);
    paramIndex++;
  }

  for (const [field, value] of Object.entries(otherFilters)) {
    if (value !== undefined && value !== null && value !== '') {
      conditions.push(`ri.${field} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const query = `
    SELECT 
      ri.*,
      row_to_json(i) AS ingredient,
      row_to_json(r) AS recipe
    FROM recipe_ingredients ri
    LEFT JOIN items i ON ri.ingredient_id = i.id
    LEFT JOIN recipes r ON ri.recipe_id = r.id
    ${whereClause}
    ORDER BY ri.${sortBy} ${sortOrder}
    LIMIT $${paramIndex++} OFFSET $${paramIndex};
  `;
  values.push(limit, skip);

  const result = await pool.query(query, values);
  const ingredients: any[] = result.rows;

  const countQuery = `SELECT COUNT(*) FROM recipe_ingredients ri ${whereClause};`;
  const countResult = await pool.query(countQuery, values.slice(0, paramIndex - 2));
  const total = parseInt(countResult.rows[0].count, 10);

  return {
    meta: { page, limit, total },
    data: ingredients,
  };
};

const getRecipeIngrediantsByRecipeId = async (recipeId: number): Promise<IRecipeIngrediant[]> => {
  const query = `
    SELECT
      ri.*,
      json_build_object(
        'id', r.id,
        'name', r.name,
        'description', r.description,
        'yield_quantity', r.yield_quantity,
        'yield_unit', r.yield_unit,
        'total_weight', r.total_weight,
        'category_id', r.category_id
      ) AS recipe,
      json_build_object(
        'id', i.id,
        'name', i.name,
        'description', i.description,
        'unit', i.unit,
        'stock_quantity', i.stock_quantity,
        'min_stock', i.min_stock,
        'max_stock', i.max_stock,
        'cost_per_unit', i.cost_per_unit,
        'status', i.status,
        'expiry_date', i.expiry_date,
        'shelf_life', i.shelf_life,
        'storage_conditions', i.storage_conditions,
        'temperature_range', i.temperature_range,
        'humidity_range', i.humidity_range,
        'batch_tracking_enabled', i.batch_tracking_enabled,
        'supplier_id', i.supplier_id,
        'category_id', i.category_id,
        'location_id', i.location_id,
        'type_id', i.type_id
      ) AS ingredient
    FROM recipe_ingredients ri
    LEFT JOIN recipes r ON ri.recipe_id = r.id
    LEFT JOIN items i ON ri.ingredient_id = i.id
    WHERE ri.recipe_id = $1
    ORDER BY ri.created_at DESC;
  `;

  const result = await pool.query(query, [recipeId]);
  const recipeIngrediants: any[] = result.rows;
  const recipeIngrediantIds = recipeIngrediants.map(ri => ri.id);

  // Get substitute ingredients for all recipe ingredients
  const substituteMap: Record<number, any> = {};

  if (recipeIngrediantIds.length) {
    const substituteQuery = `
      SELECT
        ri.id as recipe_ingredient_id,
        json_build_object(
          'id', sub_i.id,
          'name', sub_i.name,
          'description', sub_i.description,
          'unit', sub_i.unit,
          'cost_per_unit', sub_i.cost_per_unit,
          'stock_quantity', sub_i.stock_quantity,
          'status', sub_i.status
        ) AS substitute_ingredient
      FROM recipe_ingredients ri
      LEFT JOIN items sub_i ON sub_i.id = ri.substitute_ids
      WHERE ri.id = ANY($1::int[]) AND ri.substitute_ids IS NOT NULL AND sub_i.id IS NOT NULL;
    `;
    const substituteResult = await pool.query(substituteQuery, [recipeIngrediantIds]);

    substituteResult.rows.forEach(row => {
      const { recipe_ingredient_id, substitute_ingredient } = row;
      substituteMap[recipe_ingredient_id] = substitute_ingredient;
    });
  }

  // Enrich recipe ingredients with substitute data
  const enrichedRecipeIngrediants = recipeIngrediants.map(ri => ({
    ...ri,
    substitute_ingredient: substituteMap[ri.id] || null
  }));

  return enrichedRecipeIngrediants;
};

const getSingleRecipeIngrediant = async (id: number): Promise<IRecipeIngrediant | null> => {
  const result = await pool.query(
    `SELECT
      ri.*,
      json_build_object(
        'id', r.id,
        'name', r.name,
        'description', r.description,
        'yield_quantity', r.yield_quantity,
        'yield_unit', r.yield_unit,
        'total_weight', r.total_weight,
        'category_id', r.category_id
      ) AS recipe,
      json_build_object(
        'id', i.id,
        'name', i.name,
        'description', i.description,
        'unit', i.unit,
        'stock_quantity', i.stock_quantity,
        'min_stock', i.min_stock,
        'max_stock', i.max_stock,
        'cost_per_unit', i.cost_per_unit,
        'status', i.status,
        'expiry_date', i.expiry_date,
        'shelf_life', i.shelf_life,
        'storage_conditions', i.storage_conditions,
        'temperature_range', i.temperature_range,
        'humidity_range', i.humidity_range,
        'batch_tracking_enabled', i.batch_tracking_enabled,
        'supplier_id', i.supplier_id,
        'category_id', i.category_id,
        'location_id', i.location_id,
        'type_id', i.type_id
      ) AS ingredient
     FROM recipe_ingredients ri
     LEFT JOIN recipes r ON ri.recipe_id = r.id
     LEFT JOIN items i ON ri.ingredient_id = i.id
     WHERE ri.id = $1`,
    [id]
  );

  if (result.rows.length === 0) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Recipe ingredient not found');
  }

  const recipeIngrediant = result.rows[0];

  // Get substitute ingredient
  let substitute_ingredient = null;
  if (recipeIngrediant.substitute_ids) {
    const substituteResult = await pool.query(
      `SELECT
        id, name, description, unit, cost_per_unit, stock_quantity, status
       FROM items
       WHERE id = $1`,
      [recipeIngrediant.substitute_ids]
    );

    if (substituteResult.rows.length > 0) {
      substitute_ingredient = substituteResult.rows[0];
    }
  }

  return {
    ...recipeIngrediant,
    substitute_ingredient,
  };
};

const updateRecipeIngrediant = async (
  id: number,
  data: Partial<IRecipeIngrediant>
): Promise<IRecipeIngrediant | null> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const fields = Object.keys(data);
    if (fields.length > 0) {
      const setClause = fields
        .map((field, index) => `${field} = $${index + 1}`)
        .join(', ');

      const values = [...fields.map(field => (data as any)[field]), id];

      const updateQuery = `
          UPDATE recipe_ingredients SET ${setClause}, updated_at = NOW()
          WHERE id = $${fields.length + 1}
          RETURNING *;
        `;
      const updateResult = await client.query(updateQuery, values);
      if (updateResult.rowCount === 0) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Recipe ingredient not found');
      }
    }

    await client.query('COMMIT');

    return await getSingleRecipeIngrediant(id); // return updated recipe ingredient
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const deleteRecipeIngrediant = async (id: number): Promise<void> => {
  const result = await pool.query('DELETE FROM recipe_ingredients WHERE id = $1', [id]);

  if (result.rowCount === 0) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Recipe ingredient not found');
  }
};

export const RecipeIngrediantService = {
  createRecipeIngrediant,
  getAllRecipeIngrediants,
  getRecipeIngrediantsByRecipeId,
  getSingleRecipeIngrediant,
  updateRecipeIngrediant,
  deleteRecipeIngrediant,
};
