import pool from '../../../utils/dbClient';
import httpStatus from 'http-status';
import ApiError from '../../../errors/ApiError';
import { IPermission } from './permission.interface';

const createPermission = async (
  data: IPermission
): Promise<IPermission | null> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const insertQuery = `
      INSERT INTO permissions (title, description)
      VALUES ($1, $2)
      RETURNING *;
    `;
    const values = [data.title, data.description ?? null];

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

const getAllPermissions = async (filters: any): Promise<IPermission[]> => {
  const { searchTerm, ...filterFields } = filters;

  const conditions: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (searchTerm) {
    const searchFields = ['title', 'description'];
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

  const whereClause = conditions.length
    ? `WHERE ${conditions.join(' AND ')}`
    : '';

  const query = `
    SELECT * FROM permissions
    ${whereClause}
    ORDER BY created_at DESC;
  `;

  const result = await pool.query(query, values);
  return result.rows;
};

const getSinglePermission = async (id: number): Promise<IPermission | null> => {
  const query = `SELECT * FROM permissions WHERE id = $1;`;
  const result = await pool.query(query, [id]);

  if (result.rows.length === 0) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Permission not found');
  }

  return result.rows[0];
};

const updatePermission = async (
  id: number,
  data: Partial<IPermission>
): Promise<IPermission | null> => {
  const fields = Object.keys(data);
  if (fields.length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'No data provided for update');
  }

  const setClause = fields
    .map((field, index) => `${field} = $${index + 1}`)
    .join(', ');
  const values = [...fields.map(field => (data as any)[field]), id];

  const query = `
    UPDATE permissions
    SET ${setClause}, updated_at = NOW()
    WHERE id = $${fields.length + 1}
    RETURNING *;
  `;

  const result = await pool.query(query, values);
  if (result.rows.length === 0) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Permission not found');
  }

  return result.rows[0];
};

const deletePermission = async (id: number): Promise<void> => {
  const result = await pool.query(
    'DELETE FROM permissions WHERE id = $1 RETURNING *;',
    [id]
  );

  if (result.rowCount === 0) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Permission not found');
  }
};

export const PermissionService = {
  createPermission,
  getAllPermissions,
  getSinglePermission,
  updatePermission,
  deletePermission,
};
