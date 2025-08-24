import httpStatus from 'http-status';
import ApiError from '../../../errors/ApiError';
import { paginationHelpers } from '../../../helpers/paginationHelper';
import { IGenericResponse } from '../../../interfaces/common';
import { IPaginationOptions } from '../../../interfaces/pagination';
import pool from '../../../utils/dbClient';
import { MenuItem } from './menuItems.interface';

const createMenuItem = async (payload: MenuItem): Promise<MenuItem> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // If order is not provided, get the next available order for the parent
    let order = payload.order;
    if (order === undefined) {
      const maxOrderQuery = `
        SELECT COALESCE(MAX("order"), -1) + 1 as next_order
        FROM menu_items 
        WHERE parent_id ${payload.parent_id ? '= $1' : 'IS NULL'}
      `;
      const maxOrderResult = await client.query(
        maxOrderQuery,
        payload.parent_id ? [payload.parent_id] : []
      );
      order = maxOrderResult.rows[0].next_order;
    }

    const query = `
      INSERT INTO menu_items (title, url, icon, parent_id, "order")
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;

    const result = await client.query(query, [
      payload.title,
      payload.url ?? null,
      payload.icon ?? null,
      payload.parent_id ?? null,
      order,
    ]);

    await client.query('COMMIT');

    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const getAllMenuItems = async (
  filters: Partial<MenuItem> & { searchTerm?: string; flattened?: boolean },
  paginationOptions: IPaginationOptions
): Promise<IGenericResponse<MenuItem[]>> => {
  const { searchTerm, flattened = false, ...filterFields } = filters;
  const {
    page,
    limit,
    skip,
    sortBy = 'created_at',
    sortOrder = 'desc',
  } = paginationHelpers.calculatePagination(paginationOptions);

  if (flattened) {
    // Return flattened menu items (main + children) with proper pagination
    return await getFlattenedMenuItems(searchTerm, filterFields, paginationOptions);
  }

  // Original logic for hierarchical menu items (only main menu items)
  const conditions: string[] = ['menu_items.parent_id IS NULL']; // Only main menu items
  const values: any[] = [];
  let paramIndex = 1;

  if (searchTerm) {
    const searchFields = ['menu_items.title', 'menu_items.url'];
    const searchCondition = searchFields
      .map(field => `${field} ILIKE $${paramIndex++}`)
      .join(' OR ');
    values.push(...searchFields.map(() => `%${searchTerm}%`));
    conditions.push(`(${searchCondition})`);
  }

  for (const [field, value] of Object.entries(filterFields)) {
    if (value !== undefined && value !== null) {
      conditions.push(`menu_items.${field} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  const query = `
    SELECT
      menu_items.id,
      menu_items.title,
      menu_items.url,
      menu_items.icon,
      menu_items.parent_id,
      menu_items."order",
      menu_items.created_at,
      menu_items.updated_at,
      row_to_json(pm) as parent
    FROM menu_items
    LEFT JOIN menu_items pm ON menu_items.parent_id = pm.id
    ${whereClause}
    ORDER BY menu_items."order" ASC, menu_items.${sortBy} ${sortOrder}
    LIMIT $${paramIndex++} OFFSET $${paramIndex};
  `;

  values.push(limit);
  values.push(skip);

  const result = await pool.query(query, values);

  const countQuery = `SELECT COUNT(*) FROM menu_items ${whereClause};`;
  const countResult = await pool.query(
    countQuery,
    values.slice(0, paramIndex - 2)
  );

  const total = parseInt(countResult.rows[0].count, 10);

  const parentMenuItems = result.rows.map(row => ({
    id: row.id,
    title: row.title,
    url: row.url ?? null,
    icon: row.icon ?? null,
    parent_id: row.parent_id,
    order: row.order,
    created_at: row.created_at,
    updated_at: row.updated_at,
    parent: row.parent ?? null,
    children: [], // Will be filled
  }));

  // Get all children menu items
  const childrenQuery = `SELECT * FROM menu_items WHERE parent_id IS NOT NULL ORDER BY "order" ASC;`;
  const childrenResult = await pool.query(childrenQuery);

  const childrenMap: Record<number, MenuItem[]> = {};

  for (const child of childrenResult.rows) {
    const parentId = child.parent_id;
    if (!childrenMap[parentId]) {
      childrenMap[parentId] = [];
    }
    childrenMap[parentId].push({
      id: child.id,
      title: child.title,
      url: child.url ?? null,
      icon: child.icon ?? null,
      parent_id: child.parent_id,
      order: child.order,
      created_at: child.created_at,
      updated_at: child.updated_at,
    });
  }

  for (const menuItem of parentMenuItems) {
    (menuItem as any).children = childrenMap[menuItem.id] ?? [];
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
    data: parentMenuItems,
  };
};

// Function to handle flattened menu items with proper pagination
const getFlattenedMenuItems = async (
  searchTerm: string | undefined,
  filterFields: any,
  paginationOptions: IPaginationOptions
): Promise<IGenericResponse<MenuItem[]>> => {
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
    searchConditions.push(`(m.title ILIKE $${paramIndex++} OR m.url ILIKE $${paramIndex++})`);
    searchValues.push(`%${searchTerm}%`, `%${searchTerm}%`);
  }

  for (const [field, value] of Object.entries(filterFields)) {
    if (value !== undefined && value !== null) {
      searchConditions.push(`m.${field} = $${paramIndex++}`);
      searchValues.push(value);
    }
  }

  const whereClause = searchConditions.length > 0 ? `WHERE ${searchConditions.join(' AND ')}` : '';

  // Get total count for pagination
  const countQuery = `
    SELECT COUNT(*) FROM (
      SELECT m.*,
             CASE WHEN m.parent_id IS NULL THEN 0 ELSE 1 END as is_child
      FROM menu_items m
      ${whereClause}
    ) as flattened_menu_items;
  `;

  const countResult = await pool.query(countQuery, searchValues);
  const total = parseInt(countResult.rows[0].count, 10);

  // Get paginated flattened data
  const query = `
    SELECT
      m.id,
      m.title,
      m.url,
      m.icon,
      m.parent_id,
      m."order",
      m.created_at,
      m.updated_at,
      row_to_json(pm) as parent,
      CASE WHEN m.parent_id IS NULL THEN 0 ELSE 1 END as is_child,
      CASE WHEN m.parent_id IS NULL THEN
        (SELECT COUNT(*) FROM menu_items WHERE parent_id = m.id)
      ELSE 0 END as children_count
    FROM menu_items m
    LEFT JOIN menu_items pm ON m.parent_id = pm.id
    ${whereClause}
    ORDER BY m."order" ASC, m.${sortBy} ${sortOrder}
    LIMIT $${paramIndex++} OFFSET $${paramIndex};
  `;

  const queryValues = [...searchValues, limit, skip];
  const result = await pool.query(query, queryValues);

  const flattenedMenuItems = result.rows.map(row => ({
    id: row.id,
    title: row.title,
    url: row.url ?? null,
    icon: row.icon ?? null,
    parent_id: row.parent_id,
    order: row.order,
    created_at: row.created_at,
    updated_at: row.updated_at,
    parent: row.parent ?? null,
    children_count: row.children_count || 0,
    is_child: row.is_child,
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
    data: flattenedMenuItems,
  };
};

const getSingleMenuItem = async (id: string): Promise<MenuItem | null> => {
  const query = `
    SELECT
      menu_items.*,
      row_to_json(pm) as parent
    FROM menu_items
    LEFT JOIN menu_items pm ON menu_items.parent_id = pm.id
    WHERE menu_items.id = $1;
  `;

  const result = await pool.query(query, [id]);

  if (result.rows.length === 0) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Menu item not found');
  }

  const row = result.rows[0];

  // Fetch children menu items
  const childrenQuery = `
    SELECT *
    FROM menu_items
    WHERE parent_id = $1;
  `;
  const childrenResult = await pool.query(childrenQuery, [id]);

  const children = childrenResult.rows.map(child => ({
    id: child.id,
    title: child.title,
    url: child.url ?? null,
    icon: child.icon ?? null,
    parent_id: child.parent_id,
    order: child.order,
    created_at: child.created_at,
    updated_at: child.updated_at,
  }));

  return {
    id: row.id,
    title: row.title,
    url: row.url ?? null,
    icon: row.icon ?? null,
    parent_id: row.parent_id,
    order: row.order,
    created_at: row.created_at,
    updated_at: row.updated_at,
    parent: row.parent ?? null,
    children: children,
  };
};

const updateMenuItem = async (
  id: string,
  payload: Partial<MenuItem>
): Promise<MenuItem | null> => {
  try {
    const fields = Object.keys(payload);
    if (fields.length === 0) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'No data provided for update');
    }

    const setClause = fields
      .map((field, index) => `${field} = $${index + 1}`)
      .join(', ');
    const values = [...fields.map(field => (payload as any)[field]), id];

    const query = `
      UPDATE menu_items
      SET ${setClause}, updated_at = NOW()
      WHERE id = $${fields.length + 1}
      RETURNING *;
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Menu item not found');
    }

    return result.rows[0];
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to update menu item'
    );
  }
};

const deleteMenuItem = async (id: string): Promise<MenuItem | null> => {
  try {
    const result = await pool.query(
      'DELETE FROM menu_items WHERE id = $1 RETURNING *;',
      [id]
    );

    if (result.rowCount === 0) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Menu item not found');
    }

    return result.rows[0];
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to delete menu item'
    );
  }
};

const reorderMenuItems = async (reorderData: { id: number; order: number }[]): Promise<MenuItem[]> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const results: MenuItem[] = [];
    
    for (const item of reorderData) {
      const query = `
        UPDATE menu_items 
        SET "order" = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING *;
      `;
      
      const result = await client.query(query, [item.order, item.id]);
      
      if (result.rows.length === 0) {
        throw new ApiError(httpStatus.NOT_FOUND, `Menu item with id ${item.id} not found`);
      }
      
      results.push(result.rows[0]);
    }

    await client.query('COMMIT');
    return results;
  } catch (error) {
    await client.query('ROLLBACK');
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to reorder menu items'
    );
  } finally {
    client.release();
  }
};

const bulkCreateMenuItems = async (menuItems: MenuItem[]): Promise<MenuItem[]> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const results: MenuItem[] = [];
    
    for (const item of menuItems) {
      // If order is not provided, get the next available order for the parent
      let order = item.order;
      if (order === undefined) {
        const maxOrderQuery = `
          SELECT COALESCE(MAX("order"), -1) + 1 as next_order
          FROM menu_items 
          WHERE parent_id ${item.parent_id ? '= $1' : 'IS NULL'}
        `;
        const maxOrderResult = await client.query(
          maxOrderQuery,
          item.parent_id ? [item.parent_id] : []
        );
        order = maxOrderResult.rows[0].next_order;
      }

      const query = `
        INSERT INTO menu_items (title, url, icon, parent_id, "order")
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *;
      `;

      const result = await client.query(query, [
        item.title,
        item.url ?? null,
        item.icon ?? null,
        item.parent_id ?? null,
        order,
      ]);

      results.push(result.rows[0]);
    }

    await client.query('COMMIT');
    return results;
  } catch (error) {
    await client.query('ROLLBACK');
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to create bulk menu items'
    );
  } finally {
    client.release();
  }
};

const deleteAllMenuItems = async (): Promise<{ deletedCount: number }> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get count before deletion
    const countResult = await client.query('SELECT COUNT(*) FROM menu_items');
    const deletedCount = parseInt(countResult.rows[0].count, 10);

    // Delete all menu items
    await client.query('DELETE FROM menu_items');

    await client.query('COMMIT');
    return { deletedCount };
  } catch (error) {
    await client.query('ROLLBACK');
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to delete all menu items'
    );
  } finally {
    client.release();
  }
};

export const MenuItemService = {
  createMenuItem,
  getAllMenuItems,
  getSingleMenuItem,
  updateMenuItem,
  deleteMenuItem,
  reorderMenuItems,
  bulkCreateMenuItems,
  deleteAllMenuItems
};