import httpStatus from 'http-status';
import ApiError from '../../../errors/ApiError';
import { paginationHelpers } from '../../../helpers/paginationHelper';
import { IGenericResponse } from '../../../interfaces/common';
import { IPaginationOptions } from '../../../interfaces/pagination';
import pool from '../../../utils/dbClient';
import { IRecipes } from './recipes.interface';

const createRecipe = async (data: IRecipes): Promise<IRecipes | null> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const insertRecipeQuery = `
      INSERT INTO recipes (
        name, category_id, yield_quantity, yield_unit, total_weight,
        description, note, images, recipe_code, instruction, estimated_time, price
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *;
    `;

    const values = [
      data.name,
      data.category_id ?? null,
      data.yield_quantity ? parseFloat(data.yield_quantity) : null,
      data.yield_unit ?? null,
      data.total_weight ? parseFloat(data.total_weight) : null,
      data.description ?? null,
      data.note ?? null,
      data.images ?? null,
      data.recipe_code ?? null,
      data.instruction ?? null,
      data.estimated_time ?? null,
      data.price ?? null,
    ];

    const result = await client.query(insertRecipeQuery, values);
    const recipe = result.rows[0];

    if (data.tag_ids && data.tag_ids.length > 0) {
      const pivotInserts = data.tag_ids.map(tagId =>
        client.query(
          `INSERT INTO recipe_tags (recipe_id, tag_id) VALUES ($1, $2);`,
          [recipe.id, tagId]
        )
      );
      await Promise.all(pivotInserts);
    }

    if (data.ingredients && data.ingredients.length > 0) {
      const ingredientInserts = data.ingredients.map((ingredient: any) => {
        const values = [
          recipe.id,
          ingredient.ingredient_id,
          ingredient.quantity ? parseFloat(ingredient.quantity) : null,
          ingredient.quantity_unit || null,
          ingredient.note || null,
          ingredient.is_optional || false,
          ingredient.substitute_ids || null,
        ];

        return client.query(
          `
          INSERT INTO recipe_ingredients (
            recipe_id, ingredient_id, quantity, quantity_unit,
            note, is_optional, substitute_ids
          ) VALUES ($1, $2, $3, $4, $5, $6, $7);`,
          values
        );
      });

      await Promise.all(ingredientInserts);
    }

    await client.query('COMMIT');
    return recipe;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const getAllRecipes = async (
  filters: any,
  paginationOptions: IPaginationOptions
): Promise<IGenericResponse<IRecipes[]>> => {
  const { searchTerm, search, category_id, tag_id, tag_ids, ...otherFilters } =
    filters;
  const {
    page,
    limit,
    skip,
    sortBy = 'created_at',
    sortOrder = 'desc',
  } = paginationHelpers.calculatePagination(paginationOptions);

  // Handle both tag_id (single) and tag_ids (array)
  const processedTagIds = tag_ids || (tag_id ? [tag_id] : []);

  const conditions: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  // Build the main query
  let query = `
    SELECT DISTINCT recipes.*, cat.id as category_id, cat.name as category_name, cat.description as category_description
    FROM recipes
    LEFT JOIN categories cat ON recipes.category_id = cat.id
  `;

  // Add tag filtering if processedTagIds are provided
  if (processedTagIds && processedTagIds.length > 0) {
    query += `
      WHERE recipes.id IN (
        SELECT DISTINCT rt.recipe_id 
        FROM recipe_tags rt 
        WHERE rt.tag_id = ANY($${paramIndex}::int[])
      )
    `;
    values.push(processedTagIds);
    paramIndex++;
  }

  // Handle search parameter (support both search and searchTerm)
  const searchValue = search || searchTerm;
  if (searchValue) {
    const searchFields = [
      'recipes.name',
      'recipes.description',
      'recipes.note',
    ];
    const searchCondition = searchFields
      .map(field => `${field} ILIKE $${paramIndex++}`)
      .join(' OR ');
    values.push(...searchFields.map(() => `%${searchValue}%`));
    conditions.push(`(${searchCondition})`);
  }

  if (category_id) {
    conditions.push(`recipes.category_id = $${paramIndex}`);
    values.push(category_id);
    paramIndex++;
  }

  for (const [field, value] of Object.entries(otherFilters)) {
    if (value !== undefined && value !== null && value !== '') {
      conditions.push(`recipes.${field} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }
  }

  // Add other conditions
  if (conditions.length > 0) {
    query +=
      processedTagIds && processedTagIds.length > 0
        ? ` AND ${conditions.join(' AND ')}`
        : ` WHERE ${conditions.join(' AND ')}`;
  }

  query += `
    ORDER BY recipes.${sortBy} ${sortOrder}
    LIMIT $${paramIndex++} OFFSET $${paramIndex};
  `;

  values.push(limit, skip);

  const result = await pool.query(query, values);
  const recipes = result.rows;
  const recipeIds = recipes.map(r => r.id);

  let tagMap: Record<number, any[]> = {};
  let ingredientMap: Record<number, any[]> = {};

  if (recipeIds.length > 0) {
    const tagResult = await pool.query(
      `SELECT rt.recipe_id, t.* FROM recipe_tags rt
       JOIN tags t ON rt.tag_id = t.id WHERE rt.recipe_id = ANY($1::int[])`,
      [recipeIds]
    );
    tagMap = tagResult.rows.reduce((acc, tag) => {
      if (!acc[tag.recipe_id]) acc[tag.recipe_id] = [];
      acc[tag.recipe_id].push(tag);
      return acc;
    }, {});

    const ingredientsResult = await pool.query(
      `SELECT ri.recipe_id, row_to_json(i) AS ingredient, ri.note, ri.is_optional, ri.quantity, ri.quantity_unit,
              ri.substitute_ids, ri.created_at, ri.updated_at
       FROM recipe_ingredients ri
       JOIN items i ON ri.ingredient_id = i.id
       WHERE ri.recipe_id = ANY($1::int[])`,
      [recipeIds]
    );

    ingredientMap = ingredientsResult.rows.reduce((acc, row) => {
      if (!acc[row.recipe_id]) acc[row.recipe_id] = [];
      acc[row.recipe_id].push(row);
      return acc;
    }, {});
  }

  const enrichedRecipes = recipes.map(recipe => {
    const category = recipe.category_id
      ? {
          id: recipe.category_id,
          name: recipe.category_name,
          description: recipe.category_description,
        }
      : null;

    return {
      ...recipe,
      category,
      tags: tagMap[recipe.id] || [],
      ingredients: ingredientMap[recipe.id] || [],
    };
  });

  // Build count query with the same conditions
  let countQuery = `SELECT COUNT(DISTINCT recipes.id) FROM recipes`;
  const countValues: any[] = [];
  let countParamIndex = 1;

  // Rebuild conditions for count query with correct parameter indices
  const countConditions: string[] = [];

  // Add tag filtering first for count query
  if (processedTagIds && processedTagIds.length > 0) {
    countQuery += `
      WHERE recipes.id IN (
        SELECT DISTINCT rt.recipe_id 
        FROM recipe_tags rt 
        WHERE rt.tag_id = ANY($${countParamIndex}::int[])
      )
    `;
    countValues.push(processedTagIds);
    countParamIndex++;
  }

  // Handle search conditions
  const countSearchValue = search || searchTerm;
  if (countSearchValue) {
    const searchFields = [
      'recipes.name',
      'recipes.description',
      'recipes.note',
    ];
    const searchCondition = searchFields
      .map(field => `${field} ILIKE $${countParamIndex++}`)
      .join(' OR ');
    countValues.push(...searchFields.map(() => `%${countSearchValue}%`));
    countConditions.push(`(${searchCondition})`);
  }

  // Handle category_id
  if (category_id) {
    countConditions.push(`recipes.category_id = $${countParamIndex}`);
    countValues.push(category_id);
    countParamIndex++;
  }

  // Handle other filters
  for (const [field, value] of Object.entries(otherFilters)) {
    if (value !== undefined && value !== null && value !== '') {
      countConditions.push(`recipes.${field} = $${countParamIndex}`);
      countValues.push(value);
      countParamIndex++;
    }
  }

  if (countConditions.length > 0) {
    countQuery +=
      processedTagIds && processedTagIds.length > 0
        ? ` AND ${countConditions.join(' AND ')}`
        : ` WHERE ${countConditions.join(' AND ')}`;
  }

  const countResult = await pool.query(countQuery, countValues);
  const total = parseInt(countResult.rows[0].count, 10);

  return {
    meta: { page, limit, total },
    data: enrichedRecipes,
  };
};

const getSingleRecipe = async (id: number): Promise<IRecipes | null> => {
  const recipeResult = await pool.query(
    `SELECT recipes.*, cat.id as category_id, cat.name as category_name, cat.description as category_description
     FROM recipes
     LEFT JOIN categories cat ON recipes.category_id = cat.id
     WHERE recipes.id = $1`,
    [id]
  );

  if (recipeResult.rows.length === 0) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Recipe not found');
  }

  const recipe = recipeResult.rows[0];

  const tagResult = await pool.query(
    `SELECT t.* FROM recipe_tags rt
     JOIN tags t ON rt.tag_id = t.id WHERE rt.recipe_id = $1`,
    [id]
  );

  const ingredientsResult = await pool.query(
    `SELECT row_to_json(i) AS ingredient, ri.note, ri.is_optional, ri.quantity, ri.quantity_unit,
            ri.substitute_ids, ri.created_at, ri.updated_at
     FROM recipe_ingredients ri
     JOIN items i ON ri.ingredient_id = i.id
     WHERE ri.recipe_id = $1`,
    [id]
  );

  const category = recipe.category_id
    ? {
        id: recipe.category_id,
        name: recipe.category_name,
        description: recipe.category_description,
      }
    : null;

  return {
    ...recipe,
    category,
    tags: tagResult.rows,
    ingredients: ingredientsResult.rows,
  };
};

const updateRecipe = async (
  id: number,
  data: Partial<IRecipes>
): Promise<IRecipes | null> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const fields = Object.keys(data).filter(
      f => f !== 'tag_ids' && f !== 'ingredients'
    );

    if (fields.length > 0) {
      const setClause = fields
        .map((field, index) => `${field} = $${index + 1}`)
        .join(', ');
      const values = fields.map(field => {
        const value = (data as any)[field];
        return ['yield_quantity', 'total_weight', 'price'].includes(field)
          ? value
            ? parseFloat(value)
            : null
          : value;
      });

      values.push(id);

      const updateQuery = `UPDATE recipes SET ${setClause}, updated_at = NOW() WHERE id = $${
        fields.length + 1
      } RETURNING *;`;
      const result = await client.query(updateQuery, values);
      if (result.rowCount === 0)
        throw new ApiError(httpStatus.NOT_FOUND, 'Recipe not found');
    }

    if (data.tag_ids) {
      await client.query(`DELETE FROM recipe_tags WHERE recipe_id = $1`, [id]);
      const tagInsert = data.tag_ids.map(tagId =>
        client.query(
          `INSERT INTO recipe_tags (recipe_id, tag_id) VALUES ($1, $2)`,
          [id, tagId]
        )
      );
      await Promise.all(tagInsert);
    }

    if (data.ingredients) {
      await client.query(
        `DELETE FROM recipe_ingredients WHERE recipe_id = $1`,
        [id]
      );
      const inserts = data.ingredients.map((ingredient: any) =>
        client.query(
          `INSERT INTO recipe_ingredients (
            recipe_id, ingredient_id, quantity, quantity_unit, note, is_optional, substitute_ids
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            id,
            ingredient.ingredient_id,
            ingredient.quantity ? parseFloat(ingredient.quantity) : null,
            ingredient.quantity_unit || null,
            ingredient.note || null,
            ingredient.is_optional || false,
            ingredient.substitute_ids || null,
          ]
        )
      );
      await Promise.all(inserts);
    }

    await client.query('COMMIT');
    return await getSingleRecipe(id);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const deleteRecipe = async (id: number): Promise<void> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const exists = await client.query(`SELECT id FROM recipes WHERE id = $1`, [
      id,
    ]);
    if (exists.rowCount === 0)
      throw new ApiError(httpStatus.NOT_FOUND, 'Recipe not found');

    await client.query(`DELETE FROM recipe_ingredients WHERE recipe_id = $1`, [
      id,
    ]);
    await client.query(`DELETE FROM recipe_tags WHERE recipe_id = $1`, [id]);
    await client.query(`DELETE FROM recipes WHERE id = $1`, [id]);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const RecipeService = {
  createRecipe,
  getAllRecipes,
  getSingleRecipe,
  updateRecipe,
  deleteRecipe,
};
