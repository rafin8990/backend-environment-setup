import { ISupplier } from './suppliers.interface';
import pool from '../../../utils/dbClient';
import { IGenericResponse } from '../../../interfaces/common';
import ApiError from '../../../errors/ApiError';
import httpStatus from 'http-status';
import { IPaginationOptions } from '../../../interfaces/pagination';
import { paginationHelpers } from '../../../helpers/paginationHelper';

const createSupplier = async (data: ISupplier): Promise<ISupplier | null> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const insertQuery = `
      INSERT INTO suppliers (
        name, description, contact_person, email, phone, address, city, country,
        tax_id, payment_terms, credit_limit, current_balance, status, rating, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *;
    `;

    const values = [
      data.name,
      data.description ?? null,
      data.contact_person ?? null,
      data.email ?? null,
      data.phone ?? null,
      data.address ?? null,
      data.city ?? null,
      data.country ?? null,
      data.tax_id ?? null,
      data.payment_terms ?? null,
      data.credit_limit ?? null,
      data.current_balance ?? null,
      data.status ?? 'active',
      data.rating ?? null,
      data.notes ?? null,
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

const getAllSuppliers = async (
  filters: any,
  paginationOptions: IPaginationOptions = {}
): Promise<IGenericResponse<any[]>> => {
  const { searchTerm, ...filterFields } = filters;
  console.log(searchTerm)
  const { page, limit, skip, sortBy = 'created_at', sortOrder = 'desc' } = paginationHelpers.calculatePagination(paginationOptions);

  const conditions: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  // Search
  if (searchTerm) {
    const searchFields = ['name', 'contact_person', 'email', 'city', 'country'];
    const searchConditions = searchFields
      .map(field => `${field} ILIKE $${paramIndex++}`)
      .join(' OR ');
    values.push(...searchFields.map(() => `%${searchTerm}%`));
    conditions.push(`(${searchConditions})`);
  }

  // Filters
  for (const [field, value] of Object.entries(filterFields)) {
    if (value !== undefined && value !== null) {
      conditions.push(`${field} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }
  }

  const whereClause = conditions.length
    ? `WHERE ${conditions.join(' AND ')}`
    : '';

  const query = `
    SELECT * FROM suppliers
    ${whereClause}
    ORDER BY ${sortBy} ${sortOrder}
    LIMIT $${paramIndex++} OFFSET $${paramIndex};
  `;
  values.push(limit, skip);

  const result = await pool.query(query, values);
  const suppliers: any[] = result.rows;

  // Get total count
  const countQuery = `SELECT COUNT(*) FROM suppliers ${whereClause};`;
  const countResult = await pool.query(countQuery, values.slice(0, paramIndex - 2));
  const total = parseInt(countResult.rows[0].count, 10);

  return {
    meta: {
      page,
      limit,
      total,
    },
    data: suppliers,
  };
};

const getSingleSupplier = async (id: string): Promise<ISupplier | null> => {
  try {
    const result = await pool.query('SELECT * FROM suppliers WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Supplier not found');
    }

    return result.rows[0];
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Unable to retrieve supplier');
  }
};

const updateSupplier = async (
  id: string,
  payload: Partial<ISupplier>
): Promise<ISupplier | null> => {
  try {
    const fields = Object.keys(payload);
    if (fields.length === 0) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'No data provided for update');
    }

    const updates = fields.map((field, idx) => `${field} = $${idx + 2}`).join(', ');
    const values = [id, ...fields.map(field => (payload as any)[field])];

    const query = `
      UPDATE suppliers
      SET ${updates}, updated_at = NOW()
      WHERE id = $1
      RETURNING *;
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Supplier not found');
    }

    return result.rows[0];
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to update supplier');
  }
};

const deleteSupplier = async (id: string): Promise<ISupplier | null> => {
  try {
    const query = `DELETE FROM suppliers WHERE id = $1 RETURNING *;`;
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Supplier not found');
    }

    return result.rows[0];
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to delete supplier');
  }
};

export const SupplierService = {
  createSupplier,
  getAllSuppliers,
  getSingleSupplier,
  updateSupplier,
  deleteSupplier,
};
