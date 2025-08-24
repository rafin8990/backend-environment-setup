import httpStatus from 'http-status';
import ApiError from '../../../errors/ApiError';
import pool from '../../../utils/dbClient';
import { IGenericResponse } from '../../../interfaces/common';
import { IPaginationOptions } from '../../../interfaces/pagination';
import { paginationHelpers } from '../../../helpers/paginationHelper';
import { ILocationStock, ILocationStockCreate, ILocationStockUpdate } from './locationStocks.interface';

const createLocationStock = async (data: ILocationStockCreate): Promise<ILocationStock | null> => {
  const query = `
    INSERT INTO location_stocks (
      location_id, item_id, available_quantity, reserved_quantity,
      allocated_quantity, min_stock, max_stock
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *;
  `;

  const values = [
    data.location_id,
    data.item_id,
    data.available_quantity,
    data.reserved_quantity,
    data.allocated_quantity,
    data.min_stock,
    data.max_stock,
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const getLocationStock = async (locationId: number, itemId: number): Promise<ILocationStock | null> => {
  const result = await pool.query(
    'SELECT * FROM location_stocks WHERE location_id = $1 AND item_id = $2',
    [locationId, itemId]
  );

  return result.rows.length > 0 ? result.rows[0] : null;
};

const getAllLocationStocks = async (
  filters: any,
  paginationOptions: IPaginationOptions
): Promise<IGenericResponse<Array<ILocationStock & { item: any; location: any }>>> => {
  const { 
    searchTerm, 
    item_id, 
    location_id,
    ...filterFields 
  } = filters;
  const { page, limit, skip, sortBy = 'last_updated', sortOrder = 'desc' } =
    paginationHelpers.calculatePagination(paginationOptions);

  const conditions: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  // Enhanced search functionality
  if (searchTerm) {
    const searchableFields = [
      'it.name', 
      'it.description',
      'loc.name'
    ];
    const searchClause = searchableFields.map(
      field => `${field} ILIKE $${paramIndex++}`
    ).join(' OR ');
    values.push(...searchableFields.map(() => `%${searchTerm}%`));
    conditions.push(`(${searchClause})`);
  }

  // Filter by item_id
  if (item_id) {
    conditions.push(`ls.item_id = $${paramIndex}`);
    values.push(Number(item_id));
    paramIndex++;
  }

  // Filter by location_id
  if (location_id) {
    conditions.push(`ls.location_id = $${paramIndex}`);
    values.push(Number(location_id));
    paramIndex++;
  }

  // Handle other filter fields
  for (const [field, value] of Object.entries(filterFields)) {
    if (value !== undefined && value !== null) {
      conditions.push(`ls.${field} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const query = `
    SELECT 
      ls.*, 
      row_to_json(it) AS item,
      row_to_json(loc) AS location
    FROM location_stocks ls
    LEFT JOIN items it ON ls.item_id = it.id
    LEFT JOIN locations loc ON ls.location_id = loc.id
    ${whereClause}
    ORDER BY ls.${sortBy} ${sortOrder}
    LIMIT $${paramIndex++} OFFSET $${paramIndex};
  `;
  values.push(limit, skip);

  const result = await pool.query(query, values);

  const countQuery = `SELECT COUNT(*) FROM location_stocks ls LEFT JOIN items it ON ls.item_id = it.id LEFT JOIN locations loc ON ls.location_id = loc.id ${whereClause};`;
  const countResult = await pool.query(countQuery, values.slice(0, paramIndex - 2));
  const total = parseInt(countResult.rows[0].count, 10);

  return {
    meta: { page, limit, total },
    data: result.rows,
  };
};

const getLocationStocksByLocation = async (
  locationId: number,
  paginationOptions: IPaginationOptions
): Promise<IGenericResponse<Array<ILocationStock & { item: any; location: any }>>> => {
  const { page, limit, skip, sortBy = 'last_updated', sortOrder = 'desc' } =
    paginationHelpers.calculatePagination(paginationOptions);

  const query = `
    SELECT 
      ls.*, 
      row_to_json(it) AS item,
      row_to_json(loc) AS location
    FROM location_stocks ls
    LEFT JOIN items it ON ls.item_id = it.id
    LEFT JOIN locations loc ON ls.location_id = loc.id
    WHERE ls.location_id = $1
    ORDER BY ls.${sortBy} ${sortOrder}
    LIMIT $2 OFFSET $3;
  `;

  const result = await pool.query(query, [locationId, limit, skip]);

  const countQuery = `SELECT COUNT(*) FROM location_stocks WHERE location_id = $1;`;
  const countResult = await pool.query(countQuery, [locationId]);
  const total = parseInt(countResult.rows[0].count, 10);

  return {
    meta: { page, limit, total },
    data: result.rows,
  };
};

const updateLocationStock = async (
  locationId: number,
  itemId: number,
  data: ILocationStockUpdate
): Promise<ILocationStock | null> => {
  const fields = Object.keys(data);
  if (fields.length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'No fields to update');
  }

  const setClause = fields
    .map((field, index) => `${field} = $${index + 1}`)
    .join(', ');

  const values = fields.map(field => (data as any)[field]);
  values.push(locationId, itemId); // For WHERE clause

  const query = `
    UPDATE location_stocks
    SET ${setClause}, last_updated = NOW(), updated_at = NOW()
    WHERE location_id = $${fields.length + 1} AND item_id = $${fields.length + 2}
    RETURNING *;
  `;

  const result = await pool.query(query, values);
  if (result.rowCount === 0) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Location stock record not found');
  }

  return result.rows[0];
};

const updateLocationStockQuantity = async (
  locationId: number,
  itemId: number,
  quantity: number,
  operation: 'add' | 'subtract' | 'set',
  quantityType: 'available' | 'reserved' | 'allocated' = 'available'
): Promise<ILocationStock | null> => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Get current stock record
    const currentStock = await client.query(
      'SELECT * FROM location_stocks WHERE location_id = $1 AND item_id = $2 FOR UPDATE',
      [locationId, itemId]
    );

    if (currentStock.rows.length === 0) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Location stock record not found');
    }

    const currentRecord = currentStock.rows[0];
    const currentQuantity = parseFloat(String(currentRecord[`${quantityType}_quantity`] ?? 0));
    let newQuantity: number;

    switch (operation) {
      case 'add':
        newQuantity = currentQuantity + quantity;
        break;
      case 'subtract':
        newQuantity = Math.max(0, currentQuantity - quantity);
        break;
      case 'set':
        newQuantity = quantity;
        break;
      default:
        throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid operation');
    }

    // Update the quantity
    const updateQuery = `
      UPDATE location_stocks
      SET ${quantityType}_quantity = $1, last_updated = NOW(), updated_at = NOW()
      WHERE location_id = $2 AND item_id = $3
      RETURNING *;
    `;

    const result = await client.query(updateQuery, [newQuantity, locationId, itemId]);
    
    await client.query('COMMIT');
    return result.rows[0];

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const bulkUpdateLocationStocks = async (
  locationId: number,
  updates: Array<{ item_id: number } & Partial<ILocationStockUpdate>>
): Promise<{
  success: ILocationStock[];
  errors: Array<{ index: number; error: string; data: any }>;
}> => {
  const client = await pool.connect();
  const success: ILocationStock[] = [];
  const errors: Array<{ index: number; error: string; data: any }> = [];

  try {
    await client.query('BEGIN');

    for (let i = 0; i < updates.length; i++) {
      const update = updates[i];
      
      try {
        // Check if location stock record exists
        const existingRecord = await client.query(
          'SELECT id FROM location_stocks WHERE location_id = $1 AND item_id = $2',
          [locationId, update.item_id]
        );

        if (existingRecord.rows.length === 0) {
          errors.push({
            index: i,
            error: `Location stock record not found for item ${update.item_id}`,
            data: update
          });
          continue;
        }

        // Build dynamic update query
        const updateFields = [];
        const values = [];
        let paramIndex = 1;

        if (update.available_quantity !== undefined) {
          updateFields.push(`available_quantity = $${paramIndex++}`);
          values.push(update.available_quantity);
        }
        if (update.reserved_quantity !== undefined) {
          updateFields.push(`reserved_quantity = $${paramIndex++}`);
          values.push(update.reserved_quantity);
        }
        if (update.allocated_quantity !== undefined) {
          updateFields.push(`allocated_quantity = $${paramIndex++}`);
          values.push(update.allocated_quantity);
        }
        if (update.min_stock !== undefined) {
          updateFields.push(`min_stock = $${paramIndex++}`);
          values.push(update.min_stock);
        }
        if (update.max_stock !== undefined) {
          updateFields.push(`max_stock = $${paramIndex++}`);
          values.push(update.max_stock);
        }

        if (updateFields.length === 0) {
          errors.push({
            index: i,
            error: 'No fields to update',
            data: update
          });
          continue;
        }

        updateFields.push(`last_updated = NOW()`, `updated_at = NOW()`);
        values.push(locationId, update.item_id);

        const query = `
          UPDATE location_stocks
          SET ${updateFields.join(', ')}
          WHERE location_id = $${paramIndex} AND item_id = $${paramIndex + 1}
          RETURNING *;
        `;

        const result = await client.query(query, values);
        success.push(result.rows[0]);

      } catch (error) {
        errors.push({
          index: i,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
          data: update
        });
      }
    }

    await client.query('COMMIT');
    return { success, errors };

  } catch (error) {
    await client.query('ROLLBACK');
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to update bulk location stocks'
    );
  } finally {
    client.release();
  }
};

const checkStockAvailability = async (
  locationId: number,
  items: Array<{ item_id: number; quantity: number }>
): Promise<{
  available: boolean;
  unavailableItems: Array<{ item_id: number; requested: number; available: number }>;
}> => {
  const itemIds = items.map(item => item.item_id);
  
  const result = await pool.query(
    `SELECT item_id, available_quantity FROM location_stocks 
     WHERE location_id = $1 AND item_id = ANY($2::int[])`,
    [locationId, itemIds]
  );

  const stockMap = new Map(result.rows.map(row => [row.item_id, row.available_quantity]));
  const unavailableItems: Array<{ item_id: number; requested: number; available: number }> = [];

  for (const item of items) {
    const availableQty = stockMap.get(item.item_id) || 0;
    if (availableQty < item.quantity) {
      unavailableItems.push({
        item_id: item.item_id,
        requested: item.quantity,
        available: availableQty
      });
    }
  }

  return {
    available: unavailableItems.length === 0,
    unavailableItems
  };
};

export const LocationStockService = {
  createLocationStock,
  getLocationStock,
  getAllLocationStocks,
  getLocationStocksByLocation,
  updateLocationStock,
  updateLocationStockQuantity,
  bulkUpdateLocationStocks,
  checkStockAvailability,
};
