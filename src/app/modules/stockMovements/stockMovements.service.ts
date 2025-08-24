import { paginationHelpers } from '../../../helpers/paginationHelper';
import { IGenericResponse } from '../../../interfaces/common';
import { IPaginationOptions } from '../../../interfaces/pagination';
import pool from '../../../utils/dbClient';
import {
  IStockMovement,
  IStockMovementCreate
} from './stockMovements.interface';

const recordStockMovement = async (data: IStockMovementCreate): Promise<IStockMovement | null> => {
  const query = `
    INSERT INTO stock_movements (
      item_id, location_id, movement_type, quantity,
      reference_type, reference_id, previous_quantity, new_quantity,
      unit_cost, notes, created_by
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *;
  `;

  const values = [
    data.item_id,
    data.location_id,
    data.movement_type,
    data.quantity,
    data.reference_type,
    data.reference_id,
    data.previous_quantity,
    data.new_quantity,
    data.unit_cost || null,
    data.notes || null,
    data.created_by || null,
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const getStockMovementHistory = async (
  filters: any,
  paginationOptions: IPaginationOptions
): Promise<IGenericResponse<Array<IStockMovement & { 
  item: any; 
  location: any; 
  created_by_user?: any;
}>>> => {
  const { 
    searchTerm, 
    item_id, 
    location_id,
    movement_type,
    reference_type,
    reference_id,
    date_from,
    date_to,
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
      'sm.notes', 
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
    conditions.push(`sm.item_id = $${paramIndex}`);
    values.push(Number(item_id));
    paramIndex++;
  }

  // Filter by location_id
  if (location_id) {
    conditions.push(`sm.location_id = $${paramIndex}`);
    values.push(Number(location_id));
    paramIndex++;
  }

  // Filter by movement_type
  if (movement_type) {
    conditions.push(`sm.movement_type = $${paramIndex}`);
    values.push(movement_type);
    paramIndex++;
  }

  // Filter by reference_type
  if (reference_type) {
    conditions.push(`sm.reference_type = $${paramIndex}`);
    values.push(reference_type);
    paramIndex++;
  }

  // Filter by reference_id
  if (reference_id) {
    conditions.push(`sm.reference_id = $${paramIndex}`);
    values.push(Number(reference_id));
    paramIndex++;
  }

  // Date range filtering
  if (date_from) {
    conditions.push(`sm.created_at >= $${paramIndex}`);
    values.push(date_from);
    paramIndex++;
  }

  if (date_to) {
    conditions.push(`sm.created_at <= $${paramIndex}`);
    values.push(date_to);
    paramIndex++;
  }

  // Handle other filter fields
  for (const [field, value] of Object.entries(filterFields)) {
    if (value !== undefined && value !== null) {
      conditions.push(`sm.${field} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const query = `
    SELECT 
      sm.*, 
      row_to_json(it) AS item,
      row_to_json(loc) AS location,
      row_to_json(cu) AS created_by_user
    FROM stock_movements sm
    LEFT JOIN items it ON sm.item_id = it.id
    LEFT JOIN locations loc ON sm.location_id = loc.id
    LEFT JOIN users cu ON sm.created_by = cu.id
    ${whereClause}
    ORDER BY sm.${sortBy} ${sortOrder}
    LIMIT $${paramIndex++} OFFSET $${paramIndex};
  `;
  values.push(limit, skip);

  const result = await pool.query(query, values);

  const countQuery = `SELECT COUNT(*) FROM stock_movements sm LEFT JOIN items it ON sm.item_id = it.id LEFT JOIN locations loc ON sm.location_id = loc.id LEFT JOIN users cu ON sm.created_by = cu.id ${whereClause};`;
  const countResult = await pool.query(countQuery, values.slice(0, paramIndex - 2));
  const total = parseInt(countResult.rows[0].count, 10);

  return {
    meta: { page, limit, total },
    data: result.rows,
  };
};

const getStockMovementsByItem = async (
  itemId: number,
  locationId?: number,
  paginationOptions?: IPaginationOptions
): Promise<IGenericResponse<Array<IStockMovement & { 
  location: any; 
  created_by_user?: any;
}>>> => {
  const { page, limit, skip, sortBy = 'created_at', sortOrder = 'desc' } =
    paginationHelpers.calculatePagination(paginationOptions || {});

  const conditions = [`sm.item_id = $1`];
  const values = [itemId];
  let paramIndex = 2;

  if (locationId) {
    conditions.push(`sm.location_id = $${paramIndex}`);
    values.push(locationId);
    paramIndex++;
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  const query = `
    SELECT 
      sm.*, 
      row_to_json(loc) AS location,
      row_to_json(cu) AS created_by_user
    FROM stock_movements sm
    LEFT JOIN locations loc ON sm.location_id = loc.id
    LEFT JOIN users cu ON sm.created_by = cu.id
    ${whereClause}
    ORDER BY sm.${sortBy} ${sortOrder}
    LIMIT $${paramIndex++} OFFSET $${paramIndex};
  `;
  values.push(limit, skip);

  const result = await pool.query(query, values);

  const countQuery = `SELECT COUNT(*) FROM stock_movements sm WHERE item_id = $1${locationId ? ' AND location_id = $2' : ''};`;
  const countResult = await pool.query(countQuery, locationId ? [itemId, locationId] : [itemId]);
  const total = parseInt(countResult.rows[0].count, 10);

  return {
    meta: { page, limit, total },
    data: result.rows,
  };
};

const getStockMovementsByLocation = async (
  locationId: number,
  paginationOptions?: IPaginationOptions
): Promise<IGenericResponse<Array<IStockMovement & { 
  item: any; 
  created_by_user?: any;
}>>> => {
  const { page, limit, skip, sortBy = 'created_at', sortOrder = 'desc' } =
    paginationHelpers.calculatePagination(paginationOptions || {});

  const query = `
    SELECT 
      sm.*, 
      row_to_json(it) AS item,
      row_to_json(cu) AS created_by_user
    FROM stock_movements sm
    LEFT JOIN items it ON sm.item_id = it.id
    LEFT JOIN users cu ON sm.created_by = cu.id
    WHERE sm.location_id = $1
    ORDER BY sm.${sortBy} ${sortOrder}
    LIMIT $2 OFFSET $3;
  `;

  const result = await pool.query(query, [locationId, limit, skip]);

  const countQuery = `SELECT COUNT(*) FROM stock_movements WHERE location_id = $1;`;
  const countResult = await pool.query(countQuery, [locationId]);
  const total = parseInt(countResult.rows[0].count, 10);

  return {
    meta: { page, limit, total },
    data: result.rows,
  };
};

const getStockMovementsByReference = async (
  referenceType: string,
  referenceId: number
): Promise<IStockMovement[]> => {
  const result = await pool.query(
    `
    SELECT 
      sm.*, 
      row_to_json(it) AS item,
      row_to_json(loc) AS location
    FROM stock_movements sm
    LEFT JOIN items it ON sm.item_id = it.id
    LEFT JOIN locations loc ON sm.location_id = loc.id
    WHERE sm.reference_type = $1 AND sm.reference_id = $2
    ORDER BY sm.created_at DESC;
    `,
    [referenceType, referenceId]
  );

  return result.rows;
};

const getStockMovementSummary = async (
  locationId?: number,
  itemId?: number,
  dateFrom?: string,
  dateTo?: string
): Promise<{
  total_movements: number;
  total_quantity_in: number;
  total_quantity_out: number;
  net_quantity: number;
  movement_types: Array<{ type: string; count: number; quantity: number }>;
}> => {
  const conditions: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (locationId) {
    conditions.push(`location_id = $${paramIndex}`);
    values.push(locationId);
    paramIndex++;
  }

  if (itemId) {
    conditions.push(`item_id = $${paramIndex}`);
    values.push(itemId);
    paramIndex++;
  }

  if (dateFrom) {
    conditions.push(`created_at >= $${paramIndex}`);
    values.push(dateFrom);
    paramIndex++;
  }

  if (dateTo) {
    conditions.push(`created_at <= $${paramIndex}`);
    values.push(dateTo);
    paramIndex++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Get summary statistics
  const summaryQuery = `
    SELECT 
      COUNT(*) as total_movements,
      COALESCE(SUM(CASE WHEN movement_type IN ('purchase', 'transfer_in') THEN quantity ELSE 0 END), 0) as total_quantity_in,
      COALESCE(SUM(CASE WHEN movement_type IN ('sale', 'transfer_out') THEN quantity ELSE 0 END), 0) as total_quantity_out
    FROM stock_movements
    ${whereClause};
  `;

  const summaryResult = await pool.query(summaryQuery, values);
  const summary = summaryResult.rows[0];

  // Get movement types breakdown
  const typesQuery = `
    SELECT 
      movement_type,
      COUNT(*) as count,
      SUM(quantity) as quantity
    FROM stock_movements
    ${whereClause}
    GROUP BY movement_type
    ORDER BY count DESC;
  `;

  const typesResult = await pool.query(typesQuery, values);

  return {
    total_movements: parseInt(summary.total_movements, 10),
    total_quantity_in: parseFloat(summary.total_quantity_in),
    total_quantity_out: parseFloat(summary.total_quantity_out),
    net_quantity: parseFloat(summary.total_quantity_in) - parseFloat(summary.total_quantity_out),
    movement_types: typesResult.rows.map(row => ({
      type: row.movement_type,
      count: parseInt(row.count, 10),
      quantity: parseFloat(row.quantity)
    }))
  };
};

export const StockMovementService = {
  recordStockMovement,
  getStockMovementHistory,
  getStockMovementsByItem,
  getStockMovementsByLocation,
  getStockMovementsByReference,
  getStockMovementSummary,
};
