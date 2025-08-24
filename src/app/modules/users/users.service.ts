import bcrypt from 'bcryptjs';
import httpStatus from 'http-status';
import ApiError from '../../../errors/ApiError';
import pool from '../../../utils/dbClient';
import { IPaginationOptions } from '../../../interfaces/pagination';
import { IGenericResponse } from '../../../interfaces/common';
import { paginationHelpers } from '../../../helpers/paginationHelper';
import { IUser } from './users.interface';
import config from '../../../config';

const createUser = async (data: IUser): Promise<IUser | null> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const hashedPassword = await bcrypt.hash(
      data.password,
      Number(config.bycrypt_salt_rounds)
    );

    const insertQuery = `
      INSERT INTO users (
        name, email, username, phone_number, address,
        organization_id, password, image, status, role
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *;
    `;

    const values = [
      data.name,
      data.email,
      data.userName,
      data.phoneNumber ?? null,
      data.address ?? null,
      data.organizationId,
      hashedPassword,
      data.image ?? null,
      data.status,
      data.role,
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

const getAllUsers = async (
  filters: any,
  paginationOptions: IPaginationOptions
): Promise<IGenericResponse<IUser[]>> => {
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

  // 🔍 Search support
  if (searchTerm) {
    const searchFields = [
      'name',
      'email',
      'username',
      'phone_number',
      'address',
    ];
    const searchCondition = searchFields
      .map(field => `${field} ILIKE $${paramIndex++}`)
      .join(' OR ');
    values.push(...searchFields.map(() => `%${searchTerm}%`));
    conditions.push(`(${searchCondition})`);
  }

  // 🎯 Filter support
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

  // ✅ Query users
  const query = `
    SELECT * FROM users
    ${whereClause}
    ORDER BY ${sortBy} ${sortOrder}
    LIMIT $${paramIndex++} OFFSET $${paramIndex};
  `;

  values.push(limit);
  values.push(skip);

  const result = await pool.query(query, values);

  // ✅ Count total
  const countQuery = `SELECT COUNT(*) FROM users ${whereClause};`;
  const countResult = await pool.query(
    countQuery,
    values.slice(0, paramIndex - 2)
  );

  const total = parseInt(countResult.rows[0].count, 10);

  const paginationMeta = {
    page,
    limit,
    total,
    ...paginationHelpers.calculatePaginationMetadata(page, limit, total),
  };

  return {
    meta: paginationMeta,
    data: result.rows,
  };
};
const getSingleUser = async (id: number): Promise<IUser | null> => {
  const query = `SELECT * FROM users WHERE id = $1;`;
  const result = await pool.query(query, [id]);

  if (result.rows.length === 0) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  return result.rows[0];
};

const updateUser = async (
  id: number,
  data: Partial<IUser>
): Promise<IUser | null> => {
  try {
    const fields = Object.keys(data);

    if (fields.length === 0) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'No data provided for update');
    }

    // Valid fields in DB (snake_case)
    const validFields = [
      'name',
      'email',
      'userName', // ✅ Fix added
      'phoneNumber', // ✅ Fix added
      'address',
      'organizationId', // ✅ Fix added
      'password',
      'image',
      'status',
      'role',
    ];

    // camelCase (from frontend) → snake_case (for DB)
    const fieldMap: Record<string, string> = {
      name: 'name',
      email: 'email',
      userName: 'username',
      phoneNumber: 'phone_number',
      address: 'address',
      organizationId: 'organization_id',
      password: 'password',
      image: 'image',
      status: 'status',
      role: 'role',
    };

    const updates: string[] = [];
    const values: any[] = [];

    for (const [index, field] of fields.entries()) {
      const dbField = fieldMap[field];
      if (!validFields.includes(field)) {
        throw new ApiError(httpStatus.BAD_REQUEST, `Invalid field: ${field}`);
      }

      let value = (data as any)[field];

      if (field === 'password') {
        value = await bcrypt.hash(value, Number(config.bycrypt_salt_rounds));
      }

      updates.push(`"${dbField}" = $${index + 1}`);
      values.push(value);
    }

    values.push(id); // For WHERE clause

    const query = `
      UPDATE users
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${fields.length + 1}
      RETURNING *;
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
    }

    return result.rows[0];
  } catch (error: any) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      error.message || 'Failed to update user'
    );
  }
};

const deleteUser = async (id: number): Promise<void> => {
  try {
    const result = await pool.query(
      'DELETE FROM users WHERE id = $1 RETURNING *;',
      [id]
    );

    if (result.rowCount === 0) {
      throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to delete user'
    );
  }
};

export const UserService = {
  createUser,
  getAllUsers,
  getSingleUser,
  updateUser,
  deleteUser,
};
