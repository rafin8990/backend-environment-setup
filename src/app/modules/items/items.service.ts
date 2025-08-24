import httpStatus from 'http-status';
import pool from '../../../utils/dbClient';
import ApiError from '../../../errors/ApiError';
import { IItem } from './items.interface';
import { ITag } from '../tags/tags.interface';
import { IPaginationOptions } from '../../../interfaces/pagination';
import { paginationHelpers } from '../../../helpers/paginationHelper';
import { IGenericResponse } from '../../../interfaces/common';

const createItem = async (data: IItem): Promise<IItem> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const insertItemQuery = `
      INSERT INTO items (
        name, supplier_id, type_id, category_id, location_id, description,
        unit, image_urls, stock_quantity, min_stock, max_stock,
        expiry_date, cost_per_unit, last_restocked, shelf_life,
        storage_conditions, temperature_range, humidity_range,
        status, batch_tracking_enabled, note
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,
        $7,$8,$9,$10,$11,
        $12,$13,$14,$15,
        $16,$17,$18,
        $19,$20,$21
      )
      RETURNING *;
    `;

    const values = [
      data.name,
      data.supplier_id ?? null,
      data.type_id ?? null,
      data.category_id ?? null,
      data.location_id ?? null,
      data.description ?? null,
      data.unit ?? null,
      data.image_urls ?? [],
      data.stock_quantity ?? 0,
      data.min_stock,
      data.max_stock,
      data.expiry_date ?? null,
      data.cost_per_unit ?? null,
      data.last_restocked ?? null,
      data.shelf_life ?? null,
      data.storage_conditions ?? null,
      data.temperature_range ?? null,
      data.humidity_range ?? null,
      data.status,
      data.batch_tracking_enabled,
      data.note ?? null,
    ];

    const result = await client.query(insertItemQuery, values);
    // console.log(result)
    const item = result.rows[0];

    if (data.tag_ids?.length) {
      const tagInsertions = data.tag_ids.map(tagId =>
        client.query(
          `INSERT INTO item_tags (item_id, tag_id) VALUES ($1, $2)`,
          [item.id, tagId]
        )
      );
      await Promise.all(tagInsertions);
    }

    await client.query('COMMIT');
    return item;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[CREATE ITEM ERROR]', error); 
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to create item'
    );
  } finally {
    client.release();
  }
};

const getAllItems = async (
  filters: any,
  paginationOptions: IPaginationOptions
): Promise<IGenericResponse<Array<IItem & { tags: ITag[] }>>> => {
  const { searchTerm, tag_id, ...filterFields } = filters;
  const { page, limit, skip, sortBy = 'created_at', sortOrder = 'desc' } =
    paginationHelpers.calculatePagination(paginationOptions);

  const conditions: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (searchTerm) {
    const searchable = ['items.name', 'items.description'];
    conditions.push(
      `(${searchable
        .map(field => `${field} ILIKE $${paramIndex++}`)
        .join(' OR ')})`
    );
    searchable.forEach(() => values.push(`%${searchTerm}%`));
  }

  // Handle tag_id filter
  if (tag_id) {
    conditions.push(`items.id IN (
      SELECT item_id FROM item_tags WHERE tag_id = $${paramIndex}
    )`);
    values.push(tag_id);
    paramIndex++;
  }

  for (const [field, value] of Object.entries(filterFields)) {
    if (value !== undefined && value !== null) {
      conditions.push(`items.${field} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }
  }

  const whereClause = conditions.length
    ? `WHERE ${conditions.join(' AND ')}`
    : '';

  const itemQuery = `
    SELECT 
      items.*,
      row_to_json(sup) AS supplier,
      row_to_json(typ) AS type,
      row_to_json(cat) AS category,
      row_to_json(loc) AS location
    FROM items
    LEFT JOIN suppliers sup ON items.supplier_id = sup.id
    LEFT JOIN types typ ON items.type_id = typ.id
    LEFT JOIN categories cat ON items.category_id = cat.id
    LEFT JOIN locations loc ON items.location_id = loc.id
    ${whereClause}
    ORDER BY items.${sortBy} ${sortOrder}
    LIMIT $${paramIndex++} OFFSET $${paramIndex};
  `;
  values.push(limit, skip);

  const itemsResult = await pool.query(itemQuery, values);
  const items: any[] = itemsResult.rows;
  const itemIds = items.map(i => i.id);

  const tagMap: Record<number, any[]> = {};

  if (itemIds.length) {
    const tagQuery = `
      SELECT it.item_id, t.*
      FROM item_tags it
      JOIN tags t ON t.id = it.tag_id
      WHERE it.item_id = ANY($1::int[]);
    `;
    const tagResult = await pool.query(tagQuery, [itemIds]);
    tagResult.rows.forEach(row => {
      const { item_id, ...tag } = row;
      if (!tagMap[item_id]) tagMap[item_id] = [];
      tagMap[item_id].push(tag);
    });
  }

  const enrichedItems = items.map(item => ({
    ...item,
    tags: tagMap[item.id!] || [],
  }));

  // Update count query to include tag filter
  let countQuery = `SELECT COUNT(*) FROM items`;
  let countValues = [];
  
  if (tag_id) {
    countQuery += ` WHERE id IN (SELECT item_id FROM item_tags WHERE tag_id = $1)`;
    countValues.push(tag_id);
  } else if (conditions.length > 0) {
    countQuery += ` ${whereClause}`;
    countValues = values.slice(0, paramIndex - 2);
  }
  
  const countResult = await pool.query(countQuery, countValues);
  const total = parseInt(countResult.rows[0].count, 10);

  return {
    meta: { page, limit, total },
    data: enrichedItems,
  };
};

const getSingleItem = async (id: number): Promise<IItem & { tags: ITag[] }> => {
  const result = await pool.query(
    `
    SELECT 
      items.*,
      row_to_json(sup) AS supplier,
      row_to_json(typ) AS type,
      row_to_json(cat) AS category,
      row_to_json(loc) AS location
    FROM items
    LEFT JOIN suppliers sup ON items.supplier_id = sup.id
    LEFT JOIN types typ ON items.type_id = typ.id
    LEFT JOIN categories cat ON items.category_id = cat.id
    LEFT JOIN locations loc ON items.location_id = loc.id
    WHERE items.id = $1;
    `,
    [id]
  );

  if (!result.rows.length) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Item not found');
  }

  const item = result.rows[0];

  const tagResult = await pool.query(
    `
    SELECT t.*
    FROM item_tags it
    JOIN tags t ON t.id = it.tag_id
    WHERE it.item_id = $1;
    `,
    [id]
  );

  return {
    ...item,
    tags: tagResult.rows,
  };
};

const updateItem = async (
  id: number,
  data: Partial<IItem> & { tag_ids?: number[] }
): Promise<IItem & { tags: ITag[] }> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const fields = Object.keys(data).filter(k => k !== 'tag_ids');
    if (fields.length === 0 && !data.tag_ids) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'No data provided for update');
    }

    // Update fields dynamically
    let updatedItem: IItem;
    if (fields.length > 0) {
      const setClause = fields
        .map((field, i) => `${field} = $${i + 1}`)
        .join(', ');
      const values = fields.map(field => (data as any)[field]);
      values.push(id);

      const updateQuery = `
        UPDATE items
        SET ${setClause}, updated_at = NOW()
        WHERE id = $${fields.length + 1}
        RETURNING *;
      `;

      const updateResult = await client.query(updateQuery, values);
      if (!updateResult.rows.length) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Item not found');
      }

      updatedItem = updateResult.rows[0];
    } else {
      // Just fetch the item without update if only tags are changing
      const result = await client.query('SELECT * FROM items WHERE id = $1', [
        id,
      ]);
      if (!result.rows.length) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Item not found');
      }
      updatedItem = result.rows[0];
    }

    // Update tags if provided
    if (data.tag_ids) {
      await client.query(`DELETE FROM item_tags WHERE item_id = $1`, [id]);

      const tagInsertions = data.tag_ids.map(tagId =>
        client.query(
          `INSERT INTO item_tags (item_id, tag_id) VALUES ($1, $2)`,
          [id, tagId]
        )
      );
      await Promise.all(tagInsertions);
    }

    // Fetch updated tags
    const tagResult = await client.query(
      `
      SELECT t.*
      FROM item_tags it
      JOIN tags t ON t.id = it.tag_id
      WHERE it.item_id = $1;
    `,
      [id]
    );

    await client.query('COMMIT');

    return {
      ...updatedItem,
      tags: tagResult.rows,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to update item'
    );
  } finally {
    client.release();
  }
};

const deleteItem = async (id: number): Promise<void> => {
  const client = await pool.connect();
  try {
    // First delete related records in all tables that reference this item
    // Delete from item_tags
    try {
      await client.query('DELETE FROM item_tags WHERE item_id = $1', [id]);
    } catch (error) {
      console.log('Error deleting from item_tags:', error);
    }

    // Delete from low_stock_alerts (restricts deletion otherwise)
    try {
      await client.query('DELETE FROM low_stock_alerts WHERE item_id = $1', [id]);
    } catch (error) {
      console.log('Low stock alerts table not found or error occurred, continuing...');
    }

    // Delete from stocks (has ON DELETE CASCADE, but we'll handle it explicitly)
    try {
      await client.query('DELETE FROM stocks WHERE item_id = $1', [id]);
    } catch (error) {
      // Table might not exist, continue
      console.log('Stocks table not found or error occurred, continuing...');
    }

    // Delete from recipe_ingredients (has ON DELETE CASCADE, but we'll handle it explicitly)
    try {
      await client.query('DELETE FROM recipe_ingredients WHERE ingredient_id = $1', [id]);
    } catch (error) {
      // Table might not exist, continue
      console.log('Recipe ingredients table not found or error occurred, continuing...');
    }

    // Delete from order_items (has ON DELETE CASCADE, but we'll handle it explicitly)
    try {
      await client.query('DELETE FROM order_items WHERE item_id = $1', [id]);
    } catch (error) {
      // Table might not exist, continue
      console.log('Order items table not found or error occurred, continuing...');
    }

    // Delete from po_items (may restrict deletion)
    try {
      await client.query('DELETE FROM po_items WHERE item_id = $1', [id]);
    } catch (error) {
      console.log('PO items table not found or error occurred, continuing...');
    }

    // Delete from requisition_items (no CASCADE, must handle manually)
    try {
      await client.query('DELETE FROM requisition_items WHERE item_id = $1', [id]);
    } catch (error) {
      // Table might not exist, continue
      console.log('Requisition items table not found or error occurred, continuing...');
    }

    // Delete from purchase_entry_items (may not exist) and pe_items
    try {
      await client.query('DELETE FROM purchase_entry_items WHERE item_id = $1', [id]);
    } catch (error) {
      // Table might not exist, continue
      console.log('Purchase entry items table not found or error occurred, continuing...');
    }
    try {
      await client.query('DELETE FROM pe_items WHERE item_id = $1', [id]);
    } catch (error) {
      console.log('PE items table not found or error occurred, continuing...');
    }

    // Then delete the item
    const result = await client.query(
      'DELETE FROM items WHERE id = $1 RETURNING *;',
      [id]
    );
    
    if (!result.rowCount) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Item not found');
    }
    
  } catch (error) {
    console.error('[DELETE ITEM ERROR]', error);
    
    // Check if it's a specific database error
    if (error instanceof Error) {
      if (error.message.includes('violates foreign key constraint')) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          `Cannot delete item: ${error.message}`
        );
      }
      throw new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR,
        `Database error: ${error.message}`
      );
    }
    
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to delete item'
    );
  } finally {
    client.release();
  }
};

export const ItemService = {
  createItem,
  getAllItems,
  getSingleItem,
  updateItem,
  deleteItem,
};
