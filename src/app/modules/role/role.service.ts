import pool from '../../../utils/dbClient';
import httpStatus from 'http-status';
import ApiError from '../../../errors/ApiError';
import { IRole } from './role.interface';
import { IPermission } from '../permission/permission.interface';

// Create Role with permissions
const createRole = async (data: IRole): Promise<IRole | null> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const roleInsertQuery = `
      INSERT INTO roles (title, description)
      VALUES ($1, $2)
      RETURNING *;
    `;
    const roleResult = await client.query(roleInsertQuery, [
      data.title,
      data.description ?? null,
    ]);
    const role = roleResult.rows[0];

    if (data.permission_ids && data.permission_ids.length > 0) {
      for (const permissionId of data.permission_ids) {
        await client.query(
          `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2);`,
          [role.id, permissionId]
        );
      }
    }

    await client.query('COMMIT');

    return getSingleRole(role.id); // Return populated
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Get All Roles with permissions
const getAllRoles = async (): Promise<IRole[]> => {
  const query = `
    SELECT r.*, 
      json_agg(json_build_object('id', p.id, 'title', p.title, 'description', p.description)) as permissions
    FROM roles r
    LEFT JOIN role_permissions rp ON r.id = rp.role_id
    LEFT JOIN permissions p ON rp.permission_id = p.id
    GROUP BY r.id
    ORDER BY r.created_at DESC;
  `;
  const result = await pool.query(query);
  return result.rows.map(row => {
    const permissions = (row.permissions as IPermission[]).filter(
      p => p.id !== null
    );
    return {
      ...row,
      permission_ids: permissions.map(p => p.id as number),
      permissions,
    };
  });
};

// Get Single Role with permissions
const getSingleRole = async (id: number): Promise<IRole | null> => {
  const query = `
    SELECT r.*, 
      json_agg(json_build_object('id', p.id, 'title', p.title, 'description', p.description)) as permissions
    FROM roles r
    LEFT JOIN role_permissions rp ON r.id = rp.role_id
    LEFT JOIN permissions p ON rp.permission_id = p.id
    WHERE r.id = $1
    GROUP BY r.id;
  `;

  const result = await pool.query(query, [id]);

  if (result.rows.length === 0) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Role not found');
  }

  const row = result.rows[0];
  const permissions = (row.permissions as IPermission[]).filter(
    p => p.id !== null
  );

  return {
    ...row,
    permission_ids: permissions.map(p => p.id as number),
    permissions,
  };
};

const updateRole = async (
  id: number,
  data: Partial<IRole>
): Promise<IRole | null> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.title !== undefined) {
      fields.push(`title = $${paramIndex++}`);
      values.push(data.title);
    }

    if (data.description !== undefined) {
      fields.push(`description = $${paramIndex++}`);
      values.push(data.description);
    }

    if (fields.length > 0) {
      const updateQuery = `
        UPDATE roles
        SET ${fields.join(', ')}, updated_at = NOW()
        WHERE id = $${paramIndex}
        RETURNING *;
      `;
      values.push(id);

      const result = await client.query(updateQuery, values);

      if (result.rowCount === 0) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Role not found');
      }
    }

    // Handle permission updates
    if (Array.isArray(data.permission_ids)) {
      await client.query(`DELETE FROM role_permissions WHERE role_id = $1;`, [
        id,
      ]);

      for (const permissionId of data.permission_ids) {
        await client.query(
          `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2);`,
          [id, permissionId]
        );
      }
    }

    await client.query('COMMIT');

    const roleQuery = `
      SELECT r.*, 
        json_agg(json_build_object('id', p.id, 'title', p.title, 'description', p.description)) as permissions
      FROM roles r
      LEFT JOIN role_permissions rp ON r.id = rp.role_id
      LEFT JOIN permissions p ON rp.permission_id = p.id
      WHERE r.id = $1
      GROUP BY r.id;
    `;

    const roleResult = await pool.query(roleQuery, [id]);

    if (roleResult.rowCount === 0) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Role not found after update');
    }

    const row = roleResult.rows[0];
    const permissions = (row.permissions as IPermission[]).filter(
      p => p.id !== null
    );

    return {
      ...row,
      permission_ids: permissions.map(p => p.id as number),
      permissions,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error instanceof ApiError
      ? error
      : new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to update role');
  } finally {
    client.release();
  }
};

const deleteRole = async (id: number): Promise<void> => {
  const result = await pool.query(
    'DELETE FROM roles WHERE id = $1 RETURNING *;',
    [id]
  );

  if (result.rowCount === 0) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Role not found');
  }
};

export const RoleService = {
  createRole,
  getAllRoles,
  getSingleRole,
  updateRole,
  deleteRole,
};
