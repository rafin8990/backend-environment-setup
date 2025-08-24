import httpStatus from 'http-status';
import ApiError from '../../../errors/ApiError';
import pool from '../../../utils/dbClient';
import { IGenericResponse } from '../../../interfaces/common';
import { IPaginationOptions } from '../../../interfaces/pagination';
import { paginationHelpers } from '../../../helpers/paginationHelper';
import { IStock } from './stocks.interface';

const createStock = async (data: IStock): Promise<IStock | null> => {
  const query = `
    INSERT INTO stocks (
      item_id, location_id, physical_stock_count, note,
      counted_at, counted_by
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *;
  `;

  const values = [
    data.item_id,
    data.location_id,
    data.physical_stock_count,
    data.note ?? null,
    data.counted_at ?? null,
    data.counted_by ?? null,
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const getAllStocks = async (
  filters: any,
  paginationOptions: IPaginationOptions
): Promise<IGenericResponse<Array<IStock & { item: any; location: any }>>> => {
  const { 
    searchTerm, 
    item_id, 
    location_id,
    counted_from, 
    counted_to, 
    counted_by,
    ...filterFields 
  } = filters;
  const { page, limit, skip, sortBy = 'created_at', sortOrder = 'desc' } =
    paginationHelpers.calculatePagination(paginationOptions);

  const conditions: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  // Enhanced search functionality
  if (searchTerm) {
    const searchableFields = [
      'stocks.note', 
      'it.name', 
      'it.description'
    ];
    const searchClause = searchableFields.map(
      field => `${field} ILIKE $${paramIndex++}`
    ).join(' OR ');
    values.push(...searchableFields.map(() => `%${searchTerm}%`));
    conditions.push(`(${searchClause})`);
  }

  // Filter by item_id
  if (item_id) {
    conditions.push(`stocks.item_id = $${paramIndex}`);
    values.push(Number(item_id));
    paramIndex++;
  }

  // Filter by location_id
  if (location_id) {
    conditions.push(`stocks.location_id = $${paramIndex}`);
    values.push(Number(location_id));
    paramIndex++;
  }

  // Filter by counted_by user
  if (counted_by) {
    conditions.push(`stocks.counted_by = $${paramIndex}`);
    values.push(Number(counted_by));
    paramIndex++;
  }

  // Date range filtering for counted_at
  if (counted_from) {
    conditions.push(`stocks.counted_at >= $${paramIndex}`);
    values.push(counted_from);
    paramIndex++;
  }

  if (counted_to) {
    conditions.push(`stocks.counted_at <= $${paramIndex}`);
    values.push(counted_to);
    paramIndex++;
  }

  // Handle other filter fields
  for (const [field, value] of Object.entries(filterFields)) {
    if (value !== undefined && value !== null) {
      conditions.push(`stocks.${field} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const query = `
    SELECT 
      stocks.*, 
      row_to_json(it) AS item,
      row_to_json(loc) AS location
    FROM stocks
    LEFT JOIN items it ON stocks.item_id = it.id
    LEFT JOIN locations loc ON stocks.location_id = loc.id
    ${whereClause}
    ORDER BY stocks.${sortBy} ${sortOrder}
    LIMIT $${paramIndex++} OFFSET $${paramIndex};
  `;
  values.push(limit, skip);

  const result = await pool.query(query, values);

  const countQuery = `SELECT COUNT(*) FROM stocks LEFT JOIN items it ON stocks.item_id = it.id LEFT JOIN locations loc ON stocks.location_id = loc.id ${whereClause};`;
  const countResult = await pool.query(countQuery, values.slice(0, paramIndex - 2));
  const total = parseInt(countResult.rows[0].count, 10);

  return {
    meta: { page, limit, total },
    data: result.rows,
  };
};

const getSingleStock = async (id: number): Promise<IStock & { item: any; location: any }> => {
  const result = await pool.query(
    `
    SELECT 
      stocks.*,
      row_to_json(it) AS item,
      row_to_json(loc) AS location
    FROM stocks
    LEFT JOIN items it ON stocks.item_id = it.id
    LEFT JOIN locations loc ON stocks.location_id = loc.id
    WHERE stocks.id = $1;
    `,
    [id]
  );

  if (result.rows.length === 0) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Stock record not found');
  }

  return result.rows[0];
};

const getStocksByItem = async (
  itemId: number,
  paginationOptions: IPaginationOptions
): Promise<IGenericResponse<Array<IStock & { item: any; location: any }>>> => {
  const { page, limit, skip, sortBy = 'counted_at', sortOrder = 'desc' } =
    paginationHelpers.calculatePagination(paginationOptions);

  const query = `
    SELECT 
      stocks.*, 
      row_to_json(it) AS item,
      row_to_json(loc) AS location
    FROM stocks
    LEFT JOIN items it ON stocks.item_id = it.id
    LEFT JOIN locations loc ON stocks.location_id = loc.id
    WHERE stocks.item_id = $1
    ORDER BY stocks.${sortBy} ${sortOrder}
    LIMIT $2 OFFSET $3;
  `;

  const result = await pool.query(query, [itemId, limit, skip]);

  const countQuery = `SELECT COUNT(*) FROM stocks WHERE item_id = $1;`;
  const countResult = await pool.query(countQuery, [itemId]);
  const total = parseInt(countResult.rows[0].count, 10);

  return {
    meta: { page, limit, total },
    data: result.rows,
  };
};

const getStocksByLocation = async (
  locationId: number,
  paginationOptions: IPaginationOptions
): Promise<IGenericResponse<Array<IStock & { item: any; location: any }>>> => {
  const { page, limit, skip, sortBy = 'counted_at', sortOrder = 'desc' } =
    paginationHelpers.calculatePagination(paginationOptions);

  const query = `
    SELECT 
      stocks.*, 
      row_to_json(it) AS item,
      row_to_json(loc) AS location
    FROM stocks
    LEFT JOIN items it ON stocks.item_id = it.id
    LEFT JOIN locations loc ON stocks.location_id = loc.id
    WHERE stocks.location_id = $1
    ORDER BY stocks.${sortBy} ${sortOrder}
    LIMIT $2 OFFSET $3;
  `;

  const result = await pool.query(query, [locationId, limit, skip]);

  const countQuery = `SELECT COUNT(*) FROM stocks WHERE location_id = $1;`;
  const countResult = await pool.query(countQuery, [locationId]);
  const total = parseInt(countResult.rows[0].count, 10);

  return {
    meta: { page, limit, total },
    data: result.rows,
  };
};

const getLatestStockByItem = async (itemId: number): Promise<IStock & { item: any; location: any } | null> => {
  const result = await pool.query(
    `
    SELECT 
      stocks.*,
      row_to_json(it) AS item,
      row_to_json(loc) AS location
    FROM stocks
    LEFT JOIN items it ON stocks.item_id = it.id
    LEFT JOIN locations loc ON stocks.location_id = loc.id
    WHERE stocks.item_id = $1
    ORDER BY stocks.counted_at DESC, stocks.created_at DESC
    LIMIT 1;
    `,
    [itemId]
  );

  return result.rows.length > 0 ? result.rows[0] : null;
};

const updateStock = async (
  id: number,
  data: Partial<IStock>
): Promise<IStock | null> => {
  const fields = Object.keys(data);
  if (fields.length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'No fields to update');
  }

  const setClause = fields
    .map((field, index) => `${field} = $${index + 1}`)
    .join(', ');

  const values = fields.map(field => (data as any)[field]);
  values.push(id); // For WHERE clause

  const query = `
    UPDATE stocks
    SET ${setClause}, updated_at = NOW()
    WHERE id = $${fields.length + 1}
    RETURNING *;
  `;

  const result = await pool.query(query, values);
  if (result.rowCount === 0) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Stock record not found');
  }

  return result.rows[0];
};

const deleteStock = async (id: number): Promise<void> => {
  const result = await pool.query('DELETE FROM stocks WHERE id = $1', [id]);
  if (result.rowCount === 0) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Stock record not found');
  }
};

const bulkCreateStocks = async (stocksData: IStock[]): Promise<{
  success: IStock[];
  errors: Array<{ index: number; error: string; data: IStock }>;
}> => {
  const client = await pool.connect();
  const success: IStock[] = [];
  const errors: Array<{ index: number; error: string; data: IStock }> = [];

  try {
    await client.query('BEGIN');

    // Validate all item_ids and location_ids exist first
    const itemIds = [...new Set(stocksData.map(stock => stock.item_id))];
    const locationIds = [...new Set(stocksData.map(stock => stock.location_id))];
    
    const itemCheckResult = await client.query(
      'SELECT id FROM items WHERE id = ANY($1::int[])',
      [itemIds]
    );
    const locationCheckResult = await client.query(
      'SELECT id FROM locations WHERE id = ANY($1::int[])',
      [locationIds]
    );
    
    const existingItemIds = new Set(itemCheckResult.rows.map(row => row.id));
    const existingLocationIds = new Set(locationCheckResult.rows.map(row => row.id));

    for (let i = 0; i < stocksData.length; i++) {
      const stockData = stocksData[i];
      
      try {
        // Check if item exists
        if (!existingItemIds.has(stockData.item_id)) {
          errors.push({
            index: i,
            error: `Item with ID ${stockData.item_id} not found`,
            data: stockData
          });
          continue;
        }

        // Check if location exists
        if (!existingLocationIds.has(stockData.location_id)) {
          errors.push({
            index: i,
            error: `Location with ID ${stockData.location_id} not found`,
            data: stockData
          });
          continue;
        }

        const query = `
          INSERT INTO stocks (
            item_id, location_id, physical_stock_count, note,
            counted_at, counted_by
          )
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *;
        `;

        const values = [
          stockData.item_id,
          stockData.location_id,
          stockData.physical_stock_count,
          stockData.note ?? null,
          stockData.counted_at ?? null,
          stockData.counted_by ?? null,
        ];

        const result = await client.query(query, values);
        success.push(result.rows[0]);

      } catch (error) {
        errors.push({
          index: i,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
          data: stockData
        });
      }
    }

    await client.query('COMMIT');
    return { success, errors };

  } catch (error) {
    await client.query('ROLLBACK');
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to create bulk stocks'
    );
  } finally {
    client.release();
  }
};

const bulkUpdateStocks = async (stocksData: Array<IStock & { id: number }>): Promise<{
  success: IStock[];
  errors: Array<{ index: number; error: string; data: IStock & { id: number } }>;
}> => {
  const client = await pool.connect();
  const success: IStock[] = [];
  const errors: Array<{ index: number; error: string; data: IStock & { id: number } }> = [];

  try {
    await client.query('BEGIN');

    // Get existing stock IDs to validate
    const stockIds = stocksData.map(stock => stock.id);
    const existingStocksResult = await client.query(
      'SELECT id FROM stocks WHERE id = ANY($1::int[])',
      [stockIds]
    );
    const existingStockIds = new Set(existingStocksResult.rows.map(row => row.id));

    // Get existing item IDs to validate (for those being updated)
    const itemIds = [...new Set(stocksData.filter(s => s.item_id).map(s => s.item_id!))];
    const locationIds = [...new Set(stocksData.filter(s => s.location_id).map(s => s.location_id!))];
    
    let existingItemIds = new Set();
    let existingLocationIds = new Set();
    
    if (itemIds.length > 0) {
      const itemCheckResult = await client.query(
        'SELECT id FROM items WHERE id = ANY($1::int[])',
        [itemIds]
      );
      existingItemIds = new Set(itemCheckResult.rows.map(row => row.id));
    }
    
    if (locationIds.length > 0) {
      const locationCheckResult = await client.query(
        'SELECT id FROM locations WHERE id = ANY($1::int[])',
        [locationIds]
      );
      existingLocationIds = new Set(locationCheckResult.rows.map(row => row.id));
    }

    for (let i = 0; i < stocksData.length; i++) {
      const stockData = stocksData[i];
      
      try {
        // Check if stock record exists
        if (!existingStockIds.has(stockData.id)) {
          errors.push({
            index: i,
            error: `Stock record with ID ${stockData.id} not found`,
            data: stockData
          });
          continue;
        }

        // Check if item exists (if item_id is being updated)
        if (stockData.item_id && !existingItemIds.has(stockData.item_id)) {
          errors.push({
            index: i,
            error: `Item with ID ${stockData.item_id} not found`,
            data: stockData
          });
          continue;
        }

        // Check if location exists (if location_id is being updated)
        if (stockData.location_id && !existingLocationIds.has(stockData.location_id)) {
          errors.push({
            index: i,
            error: `Location with ID ${stockData.location_id} not found`,
            data: stockData
          });
          continue;
        }

        // Build dynamic update query
        const updateFields = [];
        const values = [];
        let paramIndex = 1;

        if (stockData.item_id !== undefined) {
          updateFields.push(`item_id = $${paramIndex++}`);
          values.push(stockData.item_id);
        }
        if (stockData.location_id !== undefined) {
          updateFields.push(`location_id = $${paramIndex++}`);
          values.push(stockData.location_id);
        }
        if (stockData.physical_stock_count !== undefined) {
          updateFields.push(`physical_stock_count = $${paramIndex++}`);
          values.push(stockData.physical_stock_count);
        }
        if (stockData.note !== undefined) {
          updateFields.push(`note = $${paramIndex++}`);
          values.push(stockData.note);
        }
        if (stockData.counted_at !== undefined) {
          updateFields.push(`counted_at = $${paramIndex++}`);
          values.push(stockData.counted_at);
        }
        if (stockData.counted_by !== undefined) {
          updateFields.push(`counted_by = $${paramIndex++}`);
          values.push(stockData.counted_by);
        }

        if (updateFields.length === 0) {
          errors.push({
            index: i,
            error: 'No fields to update',
            data: stockData
          });
          continue;
        }

        updateFields.push(`updated_at = NOW()`);
        values.push(stockData.id);

        const query = `
          UPDATE stocks
          SET ${updateFields.join(', ')}
          WHERE id = $${paramIndex}
          RETURNING *;
        `;

        const result = await client.query(query, values);
        success.push(result.rows[0]);

      } catch (error) {
        errors.push({
          index: i,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
          data: stockData
        });
      }
    }

    await client.query('COMMIT');
    return { success, errors };

  } catch (error) {
    await client.query('ROLLBACK');
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to update bulk stocks'
    );
  } finally {
    client.release();
  }
};

export const StockService = {
  createStock,
  getAllStocks,
  getSingleStock,
  getStocksByItem,
  getStocksByLocation,
  getLatestStockByItem,
  updateStock,
  deleteStock,
  bulkCreateStocks,
  bulkUpdateStocks,
};
