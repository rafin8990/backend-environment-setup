import httpStatus from 'http-status';
import ApiError from '../../../errors/ApiError';
import pool from '../../../utils/dbClient';
import { IOrganization } from './organization.interface';

const createOrganization = async (
  data: IOrganization
): Promise<IOrganization | null> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const insertQuery = `
      INSERT INTO organizations (name, domain, address)
      VALUES ($1, $2, $3)
      RETURNING *;
    `;

    const values = [data.name, data.domain, data.address];

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

const getAllOrganizations = async (filters: any): Promise<IOrganization[]> => {
  const { searchTerm, ...filterFields } = filters;

  const conditions: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  // 🔍 Handle search
  if (searchTerm) {
    const searchFields = ['name', 'domain', 'address'];
    const searchCondition = searchFields
      .map(field => `${field} ILIKE $${paramIndex++}`)
      .join(' OR ');
    values.push(...searchFields.map(() => `%${searchTerm}%`));
    conditions.push(`(${searchCondition})`);
  }

  // 🎯 Handle specific filters
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
    SELECT * FROM organizations
    ${whereClause}
    ORDER BY created_at DESC;
  `;

  const result = await pool.query(query, values);
  return result.rows;
};

const getSingleOrganization = async (
  id: number
): Promise<IOrganization | null> => {
  const query = `SELECT * FROM organizations WHERE id = $1;`;
  const result = await pool.query(query, [id]);

  if (result.rows.length === 0) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Organization not found');
  }

  return result.rows[0];
};

const updateOrganization = async (
  id: number,
  data: Partial<IOrganization>
): Promise<IOrganization | null> => {
  const fields = Object.keys(data);
  if (fields.length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'No data provided for update');
  }

  const setClause = fields
    .map((field, index) => `${field} = $${index + 1}`)
    .join(', ');
  const values = [...fields.map(field => (data as any)[field]), id];

  const query = `
    UPDATE organizations
    SET ${setClause}, updated_at = NOW()
    WHERE id = $${fields.length + 1}
    RETURNING *;
  `;

  const result = await pool.query(query, values);
  if (result.rows.length === 0) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Organization not found');
  }

  return result.rows[0];
};

const deleteOrganization = async (id: number): Promise<void> => {
  const result = await pool.query(
    'DELETE FROM organizations WHERE id = $1 RETURNING *;',
    [id]
  );

  if (result.rowCount === 0) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Organization not found');
  }
};
export const OrganizationService = {
  createOrganization,
  getAllOrganizations,
  getSingleOrganization,
  updateOrganization,
  deleteOrganization,
};
