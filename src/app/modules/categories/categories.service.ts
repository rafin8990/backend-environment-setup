import httpStatus from 'http-status';
import ApiError from '../../../errors/ApiError';
import pool from '../../../utils/dbClient';
import { ICategory } from './categories.interface';
import { IPaginationOptions } from '../../../interfaces/pagination';
import { IGenericResponse } from '../../../interfaces/common';
import { paginationHelpers } from '../../../helpers/paginationHelper';

const createCategory = async (data: ICategory): Promise<ICategory | null> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const insertQuery = `
      INSERT INTO categories (name, parent_category_id, type_id, image, description)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;
    const values = [
      data.name,
      data.parent_category_id ?? null,
      data.type_id ?? null,
      data.image ?? null,
      data.description ?? null,
    ];

    const result = await client.query(insertQuery, values);

    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const getAllCategories = async (
  filters: Partial<ICategory> & { searchTerm?: string; flattened?: boolean },
  paginationOptions: IPaginationOptions
): Promise<IGenericResponse<ICategory[]>> => {
  const { searchTerm, flattened = false, ...filterFields } = filters;
  const {
    page,
    limit,
    skip,
    sortBy = 'created_at',
    sortOrder = 'desc',
  } = paginationHelpers.calculatePagination(paginationOptions);

  if (flattened) {
    // Return flattened categories (main + subcategories) with proper pagination
    return await getFlattenedCategories(searchTerm, filterFields, paginationOptions);
  }

  // Original logic for hierarchical categories
  const conditions: string[] = ['categories.parent_category_id IS NULL']; // 🔑 Only main categories
  const values: any[] = [];
  let paramIndex = 1;

  if (searchTerm) {
    const searchFields = ['categories.name'];
    const searchCondition = searchFields
      .map(field => `${field} ILIKE $${paramIndex++}`)
      .join(' OR ');
    values.push(...searchFields.map(() => `%${searchTerm}%`));
    conditions.push(`(${searchCondition})`);
  }

  for (const [field, value] of Object.entries(filterFields)) {
    if (value !== undefined && value !== null) {
      conditions.push(`categories.${field} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  const query = `
    SELECT
      categories.*,
      row_to_json(pt) as parent_category,
      row_to_json(t) as type
    FROM categories
    LEFT JOIN categories pt ON categories.parent_category_id = pt.id
    LEFT JOIN types t ON categories.type_id = t.id
    ${whereClause}
    ORDER BY categories.${sortBy} ${sortOrder}
    LIMIT $${paramIndex++} OFFSET $${paramIndex};
  `;

  values.push(limit);
  values.push(skip);

  const result = await pool.query(query, values);

  const countQuery = `SELECT COUNT(*) FROM categories ${whereClause};`;
  const countResult = await pool.query(
    countQuery,
    values.slice(0, paramIndex - 2)
  );

  const total = parseInt(countResult.rows[0].count, 10);

  const parentCategories = result.rows.map(row => ({
    id: row.id,
    name: row.name,
    parent_category_id: row.parent_category_id,
    type_id: row.type_id,
    image: row.image ?? null,
    description: row.description ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    parent_category: row.parent_category ?? null,
    type: row.type ?? null,
    sub_category: [], // Will be filled
  }));

  // 🔍 Get all subcategories
  const subCategoryQuery = `SELECT * FROM categories WHERE parent_category_id IS NOT NULL;`;
  const subCategoryResult = await pool.query(subCategoryQuery);

  const subCategoryMap: Record<number, ICategory[]> = {};

  for (const sub of subCategoryResult.rows) {
    const parentId = sub.parent_category_id;
    if (!subCategoryMap[parentId]) {
      subCategoryMap[parentId] = [];
    }
    subCategoryMap[parentId].push({
      id: sub.id,
      name: sub.name,
      parent_category_id: sub.parent_category_id,
      type_id: sub.type_id,
      image: sub.image ?? null,
      description: sub.description ?? null,
      created_at: sub.created_at,
      updated_at: sub.updated_at,
    });
  }

  for (const category of parentCategories) {
    (category as any).sub_category = subCategoryMap[category.id] ?? [];
  }

  return {
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1,
    },
    data: parentCategories,
  };
};

// New function to handle flattened categories with proper pagination
const getFlattenedCategories = async (
  searchTerm: string | undefined,
  filterFields: any,
  paginationOptions: IPaginationOptions
): Promise<IGenericResponse<ICategory[]>> => {
  const {
    page,
    limit,
    skip,
    sortBy = 'created_at',
    sortOrder = 'desc',
  } = paginationHelpers.calculatePagination(paginationOptions);

  // Build search conditions
  const searchConditions: string[] = [];
  const searchValues: any[] = [];
  let paramIndex = 1;

  if (searchTerm) {
    searchConditions.push(`(c.name ILIKE $${paramIndex++})`);
    searchValues.push(`%${searchTerm}%`);
  }

  for (const [field, value] of Object.entries(filterFields)) {
    if (value !== undefined && value !== null) {
      searchConditions.push(`c.${field} = $${paramIndex++}`);
      searchValues.push(value);
    }
  }

  const whereClause = searchConditions.length > 0 ? `WHERE ${searchConditions.join(' AND ')}` : '';

  // Get total count for pagination
  const countQuery = `
    SELECT COUNT(*) FROM (
      SELECT c.*,
             CASE WHEN c.parent_category_id IS NULL THEN 0 ELSE 1 END as is_subcategory
      FROM categories c
      ${whereClause}
    ) as flattened_categories;
  `;

  const countResult = await pool.query(countQuery, searchValues);
  const total = parseInt(countResult.rows[0].count, 10);

  // Get paginated flattened data
  const query = `
    SELECT
      c.*,
      row_to_json(pt) as parent_category,
      row_to_json(t) as type,
      CASE WHEN c.parent_category_id IS NULL THEN 0 ELSE 1 END as is_subcategory,
      CASE WHEN c.parent_category_id IS NULL THEN
        (SELECT COUNT(*) FROM categories WHERE parent_category_id = c.id)
      ELSE 0 END as subcategories_count
    FROM categories c
    LEFT JOIN categories pt ON c.parent_category_id = pt.id
    LEFT JOIN types t ON c.type_id = t.id
    ${whereClause}
    ORDER BY c.${sortBy} ${sortOrder}
    LIMIT $${paramIndex++} OFFSET $${paramIndex};
  `;

  const queryValues = [...searchValues, limit, skip];
  const result = await pool.query(query, queryValues);

  const flattenedCategories = result.rows.map(row => ({
    id: row.id,
    name: row.name,
    parent_category_id: row.parent_category_id,
    type_id: row.type_id,
    image: row.image ?? null,
    description: row.description ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    parent_category: row.parent_category ?? null,
    type: row.type ?? null,
    subcategories_count: row.subcategories_count || 0,
    is_subcategory: row.is_subcategory,
  }));

  return {
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1,
    },
    data: flattenedCategories,
  };
};

const getSingleCategory = async (id: number): Promise<any | null> => {
  const query = `
    SELECT
      categories.*,
      row_to_json(pt) as parent_category,
      row_to_json(t) as type
    FROM categories
    LEFT JOIN categories pt ON categories.parent_category_id = pt.id
    LEFT JOIN types t ON categories.type_id = t.id
    WHERE categories.id = $1;
  `;

  const result = await pool.query(query, [id]);

  if (result.rows.length === 0) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Category not found');
  }

  const row = result.rows[0];

  // 🔍 Fetch subcategories
  const subQuery = `
    SELECT *
    FROM categories
    WHERE parent_category_id = $1;
  `;
  const subResult = await pool.query(subQuery, [id]);

  const subCategories = subResult.rows.map(sub => ({
    id: sub.id,
    name: sub.name,
    parent_category_id: sub.parent_category_id,
    type_id: sub.type_id,
    image: sub.image ?? null,
    description: sub.description ?? null,
    created_at: sub.created_at,
    updated_at: sub.updated_at,
  }));

  return {
    id: row.id,
    name: row.name,
    parent_category_id: row.parent_category_id,
    type_id: row.type_id,
    image: row.image ?? null,
    description: row.description ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    parent_category: row.parent_category ?? null,
    type: row.type ?? null,
    sub_category: subCategories,
  };
};

const updateCategory = async (
  id: number,
  data: Partial<ICategory>
): Promise<ICategory | null> => {
  try {
    const fields = Object.keys(data);
    if (fields.length === 0) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'No data provided for update');
    }

    const setClause = fields
      .map((field, index) => `${field} = $${index + 1}`)
      .join(', ');
    const values = [...fields.map(field => (data as any)[field]), id];

    const query = `
      UPDATE categories
      SET ${setClause}, updated_at = NOW()
      WHERE id = $${fields.length + 1}
      RETURNING *;
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Category not found');
    }

    return result.rows[0];
  } catch (error) {
    if (error instanceof ApiError) throw error; // ✅ preserve 400 / 404
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to update category'
    );
  }
};

const deleteCategory = async (id: number): Promise<void> => {
  try {
    const result = await pool.query(
      'DELETE FROM categories WHERE id = $1 RETURNING *;',
      [id]
    );

    if (result.rowCount === 0) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Category not found');
    }
  } catch (error) {
    if (error instanceof ApiError) throw error; // ✅ preserve 404
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to delete category'
    );
  }
};
export const CategoryService = {
  createCategory,
  getAllCategories,
  getSingleCategory,
  updateCategory,
  deleteCategory,
};
