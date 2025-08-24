import httpStatus from 'http-status';
import ApiError from '../../../errors/ApiError';
import { paginationHelpers } from '../../../helpers/paginationHelper';
import { IGenericResponse } from '../../../interfaces/common';
import { IPaginationOptions } from '../../../interfaces/pagination';
import pool from '../../../utils/dbClient';
import { IType } from './type.interface';
import { ICategory } from '../categories/categories.interface';

const createType = async (data: IType): Promise<IType | null> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const insertQuery = `
      INSERT INTO types (
        name, parent_type_id
      ) VALUES ($1, $2)
      RETURNING *;
    `;

    const values = [data.name, data.parent_type_id ?? null];

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

const getAllTypes = async (
  filters: Partial<IType> & { searchTerm?: string },
  paginationOptions: IPaginationOptions
): Promise<IGenericResponse<any>> => {
  const { searchTerm, ...filterFields } = filters;
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
    const searchFields = ['name'];
    const searchCondition = searchFields
      .map(field => `${field} ILIKE $${paramIndex++}`)
      .join(' OR ');
    values.push(...searchFields.map(() => `%${searchTerm}%`));
    conditions.push(`(${searchCondition})`);
  }

  for (const [field, value] of Object.entries(filterFields)) {
    if (value !== undefined && value !== null) {
      conditions.push(`${field} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const typeQuery = `
    SELECT * FROM types
    ${whereClause}
    ORDER BY ${sortBy} ${sortOrder}
    LIMIT $${paramIndex++} OFFSET $${paramIndex};
  `;

  values.push(limit);
  values.push(skip);

  const typeResult = await pool.query(typeQuery, values);
  const mainTypes: IType[] = typeResult.rows;

  // Fetch ALL types for sub_type mapping
  const allTypeResult = await pool.query(`SELECT * FROM types`);
  const allTypes: IType[] = allTypeResult.rows;

  // Create sub_types map: { parent_type_id: [type, type, ...] }
  const subTypeMap: Record<number, IType[]> = {};
  for (const type of allTypes) {
    if (type.parent_type_id) {
      if (!subTypeMap[type.parent_type_id]) {
        subTypeMap[type.parent_type_id] = [];
      }
      subTypeMap[type.parent_type_id].push(type);
    }
  }

  // Fetch all categories
  const categoryResult = await pool.query(`SELECT * FROM categories`);
  const categories: ICategory[] = categoryResult.rows;

  // Group categories by type_id
  const categoriesByType: Record<number, ICategory[]> = {};
  for (const category of categories) {
    if (category.type_id) {
      if (!categoriesByType[category.type_id]) {
        categoriesByType[category.type_id] = [];
      }
      categoriesByType[category.type_id].push(category);
    }
  }

  // Final formatted types
  const formatted = mainTypes.map(type => ({
    id: type.id,
    name: type.name,
    parent_type_id: type.parent_type_id,
    sub_types: (subTypeMap[type.id!] || []).map(st => ({
      id: st.id,
      name: st.name,
      parent_type_id: st.parent_type_id,
    })),
    children: categoriesByType[type.id!] || [],
  }));

  // Count for pagination
  const countQuery = `SELECT COUNT(*) FROM types ${whereClause};`;
  const countResult = await pool.query(
    countQuery,
    values.slice(0, paramIndex - 2)
  );
  const total = parseInt(countResult.rows[0].count, 10);

  return {
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1,
    },
    data: formatted,
  };
};

const getSingleType = async (id: number): Promise<any> => {
  try {
    // Get the main type
    const typeResult = await pool.query('SELECT * FROM types WHERE id = $1', [
      id,
    ]);
    if (typeResult.rows.length === 0) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Type not found');
    }

    const type: IType = typeResult.rows[0];

    // Get sub-types
    const subTypeResult = await pool.query(
      'SELECT id, name FROM types WHERE parent_type_id = $1',
      [type.id]
    );
    const sub_types = subTypeResult.rows.map((sub: IType) => ({
      id: sub.id,
      name: sub.name,
      parent_type_id: sub.parent_type_id,
    }));

    // Get categories under this type
    const categoryResult = await pool.query(
      'SELECT * FROM categories WHERE type_id = $1',
      [type.id]
    );
    const children: ICategory[] = categoryResult.rows;

    // Return the structured object
    return {
      id: type.id,
      name: type.name,
      parent_type_id: type.parent_type_id,
      sub_types,
      children,
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Unable to retrieve type'
    );
  }
};

const updateType = async (
  id: number,
  data: Partial<IType>
): Promise<IType | null> => {
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
      UPDATE types
      SET ${setClause}, updated_at = NOW()
      WHERE id = $${fields.length + 1}
      RETURNING *;
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Type not found');
    }

    return result.rows[0];
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Unable to update type'
    );
  }
};

const deleteType = async (id: number): Promise<void> => {
  try {
    const result = await pool.query(
      'DELETE FROM types WHERE id = $1 RETURNING *;',
      [id]
    );

    if (result.rowCount === 0) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Type not found');
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to delete type'
    );
  }
};
export const TypeService = {
  createType,
  getAllTypes,
  getSingleType,
  updateType,
  deleteType,
};
