import { ILowStockAlert } from './lowStockAlerts.interface';
import pool from '../../../utils/dbClient';
import { IGenericResponse } from '../../../interfaces/common';
import ApiError from '../../../errors/ApiError';
import httpStatus from 'http-status';
import { IPaginationOptions } from '../../../interfaces/pagination';
import { paginationHelpers } from '../../../helpers/paginationHelper';

const getAllLowStockAlerts = async (
  filters: any,
  paginationOptions: IPaginationOptions = {}
): Promise<IGenericResponse<any[]>> => {
  const { searchTerm, ...filterFields } = filters;
  const { page, limit, skip, sortBy = 'alert_created_at', sortOrder = 'desc' } = paginationHelpers.calculatePagination(paginationOptions);

  const conditions: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  // Search
  if (searchTerm) {
    const searchFields = ['low_stock_alerts.notes', 'i.name', 'i.description', 's.name', 'c.name', 't.name', 'l.name'];
    const searchCondition = searchFields
      .map(field => `${field} ILIKE $${paramIndex++}`)
      .join(' OR ');
    values.push(...searchFields.map(() => `%${searchTerm}%`));
    conditions.push(`(${searchCondition})`);
  }

  // Enhanced filters
  for (const [field, value] of Object.entries(filterFields)) {
    if (value !== undefined && value !== null) {
      switch (field) {
        case 'item_name':
          conditions.push(`i.name ILIKE $${paramIndex}`);
          values.push(`%${value}%`);
          break;
        case 'item_status':
          conditions.push(`i.status = $${paramIndex}`);
          values.push(value);
          break;
        case 'supplier_id':
          conditions.push(`i.supplier_id = $${paramIndex}`);
          values.push(value);
          break;
        case 'category_id':
          conditions.push(`i.category_id = $${paramIndex}`);
          values.push(value);
          break;
        case 'type_id':
          conditions.push(`i.type_id = $${paramIndex}`);
          values.push(value);
          break;
        case 'location_id':
          conditions.push(`i.location_id = $${paramIndex}`);
          values.push(value);
          break;
        case 'supplier_name':
          conditions.push(`s.name ILIKE $${paramIndex}`);
          values.push(`%${value}%`);
          break;
        case 'category_name':
          conditions.push(`c.name ILIKE $${paramIndex}`);
          values.push(`%${value}%`);
          break;
        case 'type_name':
          conditions.push(`t.name ILIKE $${paramIndex}`);
          values.push(`%${value}%`);
          break;
        case 'location_name':
          conditions.push(`l.name ILIKE $${paramIndex}`);
          values.push(`%${value}%`);
          break;
        case 'resolved':
          // Handle boolean filtering for resolved status
          if (value === 'true' || value === true) {
            conditions.push(`i.stock_quantity >= i.min_stock`);
          } else if (value === 'false' || value === false) {
            conditions.push(`i.stock_quantity < i.min_stock`);
          }
          break;
        default:
          // Standard fields on low_stock_alerts table
          if (['item_id', 'current_stock', 'min_stock_threshold', 'alert_created_at', 'notes'].includes(field)) {
            conditions.push(`low_stock_alerts.${field} = $${paramIndex}`);
            values.push(value);
          }
          break;
      }
      if (['item_name', 'item_status', 'supplier_id', 'category_id', 'type_id', 'location_id', 'supplier_name', 'category_name', 'type_name', 'location_name', 'item_id', 'current_stock', 'min_stock_threshold', 'alert_created_at', 'notes'].includes(field)) {
        paramIndex++;
      }
    }
  }

  const whereClause = conditions.length
    ? `WHERE ${conditions.join(' AND ')}`
    : '';

  // Handle sorting - allow columns from both low_stock_alerts and items tables
  const validSortColumns = [
    'id', 'item_id', 'current_stock', 'min_stock_threshold', 'alert_created_at', 'resolved', 'notes',
    'item_name', 'item_status', 'supplier_name', 'category_name', 'type_name', 'location_name'
  ];
  
  let finalSortBy = 'resolved ASC, low_stock_alerts.alert_created_at DESC';
  if (validSortColumns.includes(sortBy)) {
    switch (sortBy) {
      case 'item_name':
        finalSortBy = 'resolved ASC, i.name ASC';
        break;
      case 'item_status':
        finalSortBy = 'resolved ASC, i.status ASC';
        break;
      case 'supplier_name':
        finalSortBy = 'resolved ASC, s.name ASC';
        break;
      case 'category_name':
        finalSortBy = 'resolved ASC, c.name ASC';
        break;
      case 'type_name':
        finalSortBy = 'resolved ASC, t.name ASC';
        break;
      case 'location_name':
        finalSortBy = 'resolved ASC, l.name ASC';
        break;
      case 'current_stock':
        finalSortBy = 'resolved ASC, i.stock_quantity ASC';
        break;
      case 'min_stock_threshold':
        finalSortBy = 'resolved ASC, i.min_stock ASC';
        break;
      default:
        finalSortBy = `resolved ASC, low_stock_alerts.${sortBy} DESC`;
        break;
    }
  }

  const query = `
    SELECT
      low_stock_alerts.id,
      low_stock_alerts.item_id,
      i.stock_quantity as current_stock,
      i.min_stock as min_stock_threshold,
      low_stock_alerts.alert_created_at,
      CASE
        WHEN i.stock_quantity < i.min_stock THEN false
        ELSE true
      END as resolved,
      CASE
        WHEN i.stock_quantity < i.min_stock THEN 'Alert starting'
        ELSE 'Alert resolved'
      END as notes,
      json_build_object(
        'id', i.id,
        'name', i.name,
        'description', i.description,
        'unit', i.unit,
        'stock_quantity', i.stock_quantity,
        'min_stock', i.min_stock,
        'max_stock', i.max_stock,
        'cost_per_unit', i.cost_per_unit,
        'status', i.status,
        'image_urls', i.image_urls,
        'expiry_date', i.expiry_date,
        'last_restocked', i.last_restocked,
        'shelf_life', i.shelf_life,
        'storage_conditions', i.storage_conditions,
        'temperature_range', i.temperature_range,
        'humidity_range', i.humidity_range,
        'batch_tracking_enabled', i.batch_tracking_enabled,
        'note', i.note,
        'created_at', i.created_at,
        'updated_at', i.updated_at,
        'supplier', CASE
          WHEN s.id IS NOT NULL THEN json_build_object(
            'id', s.id,
            'name', s.name,
            'email', s.email,
            'phone', s.phone,
            'address', s.address,
            'city', s.city,
            'country', s.country
          )
          ELSE NULL
        END,
        'category', CASE
          WHEN c.id IS NOT NULL THEN json_build_object(
            'id', c.id,
            'name', c.name,
            'description', c.description
          )
          ELSE NULL
        END,
        'type', CASE
          WHEN t.id IS NOT NULL THEN json_build_object(
            'id', t.id,
            'name', t.name
          )
          ELSE NULL
        END,
        'location', CASE
          WHEN l.id IS NOT NULL THEN json_build_object(
            'id', l.id,
            'name', l.name,
            'description', l.description,
            'type', l.type,
            'temperature_controlled', l.temperature_controlled
          )
          ELSE NULL
        END,
        'tags', COALESCE(
          (SELECT json_agg(json_build_object(
            'id', tag.id,
            'name', tag.name,
            'description', tag.description
          ))
          FROM item_tags it
          JOIN tags tag ON it.tag_id = tag.id
          WHERE it.item_id = i.id),
          '[]'::json
        )
      ) AS item
    FROM low_stock_alerts
    LEFT JOIN items i ON low_stock_alerts.item_id = i.id
    LEFT JOIN suppliers s ON i.supplier_id = s.id
    LEFT JOIN categories c ON i.category_id = c.id
    LEFT JOIN types t ON i.type_id = t.id
    LEFT JOIN locations l ON i.location_id = l.id
    ${whereClause}
    ORDER BY ${finalSortBy}
    LIMIT $${paramIndex++} OFFSET $${paramIndex};
  `;
  values.push(limit, skip);

  const result = await pool.query(query, values);
  const alerts: any[] = result.rows;

  // Get total count
  const countQuery = `
    SELECT COUNT(*) 
    FROM low_stock_alerts
    LEFT JOIN items i ON low_stock_alerts.item_id = i.id
    LEFT JOIN suppliers s ON i.supplier_id = s.id
    LEFT JOIN categories c ON i.category_id = c.id
    LEFT JOIN types t ON i.type_id = t.id
    LEFT JOIN locations l ON i.location_id = l.id
    ${whereClause}
  `;
  const countResult = await pool.query(countQuery, values.slice(0, paramIndex - 2));
  const total = parseInt(countResult.rows[0].count, 10);

  return {
    meta: {
      page,
      limit,
      total,
    },
    data: alerts,
  };
};

const getSingleLowStockAlert = async (id: string): Promise<any> => {
  const query = `
    SELECT
      low_stock_alerts.id,
      low_stock_alerts.item_id,
      i.stock_quantity as current_stock,
      i.min_stock as min_stock_threshold,
      low_stock_alerts.alert_created_at,
      CASE
        WHEN i.stock_quantity < i.min_stock THEN false
        ELSE true
      END as resolved,
      CASE
        WHEN i.stock_quantity < i.min_stock THEN 'Alert starting'
        ELSE 'Alert resolved'
      END as notes,
      json_build_object(
        'id', i.id,
        'name', i.name,
        'description', i.description,
        'unit', i.unit,
        'stock_quantity', i.stock_quantity,
        'min_stock', i.min_stock,
        'max_stock', i.max_stock,
        'cost_per_unit', i.cost_per_unit,
        'status', i.status,
        'image_urls', i.image_urls,
        'expiry_date', i.expiry_date,
        'last_restocked', i.last_restocked,
        'shelf_life', i.shelf_life,
        'storage_conditions', i.storage_conditions,
        'temperature_range', i.temperature_range,
        'humidity_range', i.humidity_range,
        'batch_tracking_enabled', i.batch_tracking_enabled,
        'note', i.note,
        'created_at', i.created_at,
        'updated_at', i.updated_at,
        'supplier', CASE
          WHEN s.id IS NOT NULL THEN json_build_object(
            'id', s.id,
            'name', s.name,
            'email', s.email,
            'phone', s.phone,
            'address', s.address,
            'city', s.city,
            'country', s.country
          )
          ELSE NULL
        END,
        'category', CASE
          WHEN c.id IS NOT NULL THEN json_build_object(
            'id', c.id,
            'name', c.name,
            'description', c.description
          )
          ELSE NULL
        END,
        'type', CASE
          WHEN t.id IS NOT NULL THEN json_build_object(
            'id', t.id,
            'name', t.name
          )
          ELSE NULL
        END,
        'location', CASE
          WHEN l.id IS NOT NULL THEN json_build_object(
            'id', l.id,
            'name', l.name,
            'description', l.description,
            'type', l.type,
            'temperature_controlled', l.temperature_controlled
          )
          ELSE NULL
        END,
        'tags', COALESCE(
          (SELECT json_agg(json_build_object(
            'id', tag.id,
            'name', tag.name,
            'description', tag.description
          ))
          FROM item_tags it
          JOIN tags tag ON it.tag_id = tag.id
          WHERE it.item_id = i.id),
          '[]'::json
        )
      ) AS item
    FROM low_stock_alerts
    LEFT JOIN items i ON low_stock_alerts.item_id = i.id
    LEFT JOIN suppliers s ON i.supplier_id = s.id
    LEFT JOIN categories c ON i.category_id = c.id
    LEFT JOIN types t ON i.type_id = t.id
    LEFT JOIN locations l ON i.location_id = l.id
    WHERE low_stock_alerts.id = $1
  `;
  const result = await pool.query(query, [id]);
  const alert = result.rows[0];
  if (!alert) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Low stock alert not found');
  }
  return alert;
};

const createLowStockAlert = async (payload: Partial<ILowStockAlert>): Promise<any> => {
  const {
    item_id,
    current_stock,
    min_stock_threshold,
    resolved = false,
    notes
  } = payload;

  const insertQuery = `
    INSERT INTO low_stock_alerts (
      item_id,
      current_stock,
      min_stock_threshold,
      alert_created_at,
      resolved,
      notes
    ) VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id
  `;

  const values = [
    item_id,
    current_stock,
    min_stock_threshold,
    new Date(),
    resolved,
    notes
  ];

  const result = await pool.query(insertQuery, values);
  const newAlertId = result.rows[0].id;
  
  // Return the created alert
  return await getSingleLowStockAlert(newAlertId);
};

const updateLowStockAlert = async (id: string, payload: Partial<ILowStockAlert>): Promise<any> => {
  // First check if the alert exists
  const existingAlert = await getSingleLowStockAlert(id);
  if (!existingAlert) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Low stock alert not found');
  }

  const updateFields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  // Build dynamic update query - only allow resolved and notes
  const allowedFields = ['resolved', 'notes'];
  for (const [key, value] of Object.entries(payload)) {
    if (value !== undefined && allowedFields.includes(key)) {
      updateFields.push(`${key} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }
  }

  if (updateFields.length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'No valid fields to update');
  }

  // Add ID parameter for WHERE clause
  values.push(id);

  const updateQuery = `
    UPDATE low_stock_alerts 
    SET ${updateFields.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING id
  `;

  await pool.query(updateQuery, values);
  
  // Return the updated alert
  return await getSingleLowStockAlert(id);
};

const deleteLowStockAlert = async (id: string): Promise<void> => {
  // First check if the alert exists
  const existingAlert = await getSingleLowStockAlert(id);
  if (!existingAlert) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Low stock alert not found');
  }

  const deleteQuery = `DELETE FROM low_stock_alerts WHERE id = $1`;
  await pool.query(deleteQuery, [id]);
};

const deleteAllLowStockAlerts = async (): Promise<void> => {
  const deleteQuery = `DELETE FROM low_stock_alerts`;
  await pool.query(deleteQuery);
};

export const LowStockAlertService = {
  getAllLowStockAlerts,
  getSingleLowStockAlert,
  createLowStockAlert,
  updateLowStockAlert,
  deleteLowStockAlert,
  deleteAllLowStockAlerts,
};