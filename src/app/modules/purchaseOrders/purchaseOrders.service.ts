import { paginationHelpers } from '../../../helpers/paginationHelper';
import { IGenericResponse } from '../../../interfaces/common';
import { IPaginationOptions } from '../../../interfaces/pagination';
import pool from '../../../utils/dbClient';
import {
  IPurchaseOrder,
  IPurchaseOrderCreate,
  IPurchaseOrderFilters,
  IPurchaseOrderUpdate
} from './purchaseOrders.interface';

const generatePONumber = async (): Promise<string> => {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const result = await pool.query(
    'SELECT COUNT(*) as count FROM purchase_orders WHERE DATE(created_at) = CURRENT_DATE'
  );
  const count = parseInt(result.rows[0].count);
  return `PO-${date}-${String(count + 1).padStart(3, '0')}`;
};

const createPurchaseOrder = async (data: IPurchaseOrderCreate): Promise<IPurchaseOrder | null> => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Generate PO number if not provided
    const poNumber = data.po_number || await generatePONumber();

    // Create purchase order
    const poQuery = `
      INSERT INTO purchase_orders (
        po_number, supplier_id, order_type, delivery_type, expected_delivery_date,
        central_delivery_location_id, notes, status, total_amount, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *;
    `;

    const poValues = [
      poNumber,
      data.supplier_id,
      data.order_type,
      data.delivery_type,
      data.expected_delivery_date,
      data.central_delivery_location_id || null,
      data.notes || null,
      data.status || 'pending',
      data.total_amount,
      data.created_by || null,
    ];

    const poResult = await client.query(poQuery, poValues);
    const purchaseOrder = poResult.rows[0];

    // Create purchase order items
    for (const item of data.items) {
      const itemQuery = `
        INSERT INTO purchase_order_items (
          purchase_order_id, item_id, quantity, unit, unit_price, total_price,
          delivery_location_id, requisition_item_ids
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8);
      `;

      const itemValues = [
        purchaseOrder.id,
        item.item_id,
        item.quantity,
        item.unit,
        item.unit_price,
        item.total_price,
        item.delivery_location_id,
        item.requisition_item_ids || [],
      ];

      await client.query(itemQuery, itemValues);
    }

    // Create delivery locations if multiple locations
    if (data.delivery_locations && data.delivery_locations.length > 0) {
      for (const location of data.delivery_locations) {
        const locationQuery = `
          INSERT INTO po_delivery_locations (
            purchase_order_id, location_id, delivery_address, expected_delivery_date
          )
          VALUES ($1, $2, $3, $4);
        `;

        const locationValues = [
          purchaseOrder.id,
          location.location_id,
          location.delivery_address || null,
          location.expected_delivery_date || null,
        ];

        await client.query(locationQuery, locationValues);
      }
    }

    await client.query('COMMIT');

    // Return the created PO with items and delivery locations
    return getSinglePurchaseOrder(purchaseOrder.id);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const getSinglePurchaseOrder = async (id: number): Promise<IPurchaseOrder | null> => {
  const result = await pool.query(`
    SELECT
      po.*,
      s.name as supplier_name,
      s.email as supplier_email,
      s.phone as supplier_phone
    FROM purchase_orders po
    LEFT JOIN suppliers s ON po.supplier_id = s.id
    WHERE po.id = $1
  `, [id]);

  if (result.rows.length === 0) {
    return null;
  }

  const purchaseOrder = result.rows[0];

  // Get items
  const itemsResult = await pool.query(`
    SELECT
      poi.*,
      i.name as item_name,
      i.description as item_description,
      i.image_urls as item_images,
      l.name as delivery_location_name
    FROM purchase_order_items poi
    LEFT JOIN items i ON poi.item_id = i.id
    LEFT JOIN locations l ON poi.delivery_location_id = l.id
    WHERE poi.purchase_order_id = $1
  `, [id]);

  // Get delivery locations
  const locationsResult = await pool.query(`
    SELECT
      pdl.*,
      l.name as location_name,
      l.description as location_description
    FROM po_delivery_locations pdl
    LEFT JOIN locations l ON pdl.location_id = l.id
    WHERE pdl.purchase_order_id = $1
  `, [id]);

  return {
    ...purchaseOrder,
    items: itemsResult.rows,
    delivery_locations: locationsResult.rows,
  };
};

const getAllPurchaseOrders = async (
  filters: IPurchaseOrderFilters,
  paginationOptions: IPaginationOptions
): Promise<IGenericResponse<IPurchaseOrder[]>> => {
  const {
    searchTerm,
    supplier_id,
    status,
    order_type,
    delivery_type,
    created_by,
    start_date,
    end_date,
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
      'po.po_number',
      'po.notes',
      's.name'
    ];
    const searchClause = searchableFields.map(
      field => `${field} ILIKE $${paramIndex++}`
    ).join(' OR ');
    values.push(...searchableFields.map(() => `%${searchTerm}%`));
    conditions.push(`(${searchClause})`);
  }

  // Filter by supplier
  if (supplier_id) {
    conditions.push(`po.supplier_id = $${paramIndex}`);
    values.push(Number(supplier_id));
    paramIndex++;
  }

  // Filter by status
  if (status) {
    conditions.push(`po.status = $${paramIndex}`);
    values.push(status);
    paramIndex++;
  }

  // Filter by order type
  if (order_type) {
    conditions.push(`po.order_type = $${paramIndex}`);
    values.push(order_type);
    paramIndex++;
  }

  // Filter by delivery type
  if (delivery_type) {
    conditions.push(`po.delivery_type = $${paramIndex}`);
    values.push(delivery_type);
    paramIndex++;
  }

  // Filter by created by
  if (created_by) {
    conditions.push(`po.created_by = $${paramIndex}`);
    values.push(Number(created_by));
    paramIndex++;
  }

  // Filter by start date
  if (start_date) {
    conditions.push(`po.created_at >= $${paramIndex}`);
    values.push(start_date);
    paramIndex++;
  }

  // Filter by end date
  if (end_date) {
    conditions.push(`po.created_at <= $${paramIndex}`);
    values.push(end_date);
    paramIndex++;
  }

  // Handle other filter fields
  for (const [field, value] of Object.entries(filterFields)) {
    if (value !== undefined && value !== null) {
      conditions.push(`po.${field} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const query = `
    SELECT
      po.*,
      s.name as supplier_name,
      s.email as supplier_email
    FROM purchase_orders po
    LEFT JOIN suppliers s ON po.supplier_id = s.id
    ${whereClause}
    ORDER BY po.${sortBy} ${sortOrder}
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1};
  `;

  values.push(limit, skip);
  const result = await pool.query(query, values);

  // Get total count
  const countQuery = `
    SELECT COUNT(*) as total
    FROM purchase_orders po
    LEFT JOIN suppliers s ON po.supplier_id = s.id
    ${whereClause};
  `;

  const countResult = await pool.query(countQuery, values.slice(0, -2));
  const total = parseInt(countResult.rows[0].total);

  return {
    meta: {
      page: page || 1,
      limit: limit || 10,
      total,
      totalPages: Math.ceil(total / (limit || 10)),
    },
    data: result.rows,
  };
};

const updatePurchaseOrder = async (
  id: number,
  updateData: IPurchaseOrderUpdate
): Promise<IPurchaseOrder | null> => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Extract items and delivery_locations from updateData
    const { items, delivery_locations, ...poUpdateData } = updateData;

    // Update purchase order
    const poResult = await client.query(
      `UPDATE purchase_orders
       SET ${Object.keys(poUpdateData).map((key, index) => `${key} = $${index + 2}`).join(', ')}, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, ...Object.values(poUpdateData)]
    );

    if (poResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return null;
    }

    // Update items if provided
    if (items && Array.isArray(items)) {
      // Delete existing items
      await client.query('DELETE FROM purchase_order_items WHERE purchase_order_id = $1', [id]);

      // Insert new items
      for (const item of items) {
        await client.query(`
          INSERT INTO purchase_order_items (
            purchase_order_id, item_id, quantity, unit, unit_price,
            total_price, delivery_location_id, requisition_item_ids
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          id,
          item.item_id,
          item.quantity,
          item.unit,
          item.unit_price,
          item.total_price,
          item.delivery_location_id,
          item.requisition_item_ids || [],
        ]);
      }
    }

    // Update delivery locations if provided
    if (delivery_locations && Array.isArray(delivery_locations)) {
      // Delete existing delivery locations
      await client.query('DELETE FROM po_delivery_locations WHERE purchase_order_id = $1', [id]);

      // Insert new delivery locations
      for (const location of delivery_locations) {
        await client.query(`
          INSERT INTO po_delivery_locations (
            purchase_order_id, location_id, delivery_address, expected_delivery_date
          ) VALUES ($1, $2, $3, $4)
        `, [
          id,
          location.location_id,
          location.delivery_address,
          location.expected_delivery_date,
        ]);
      }
    }

    await client.query('COMMIT');
    return await getSinglePurchaseOrder(id);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const updatePurchaseOrderStatus = async (
  id: number,
  status: string,
  approved_by?: number | null
): Promise<IPurchaseOrder | null> => {
  const updateData: any = { status };
  if (approved_by !== undefined && approved_by !== null) {
    updateData.approved_by = approved_by;
  }

  return await updatePurchaseOrder(id, updateData);
};

const deletePurchaseOrder = async (id: number): Promise<IPurchaseOrder | null> => {
  const result = await pool.query(
    'DELETE FROM purchase_orders WHERE id = $1 RETURNING *',
    [id]
  );

  return result.rows.length > 0 ? result.rows[0] : null;
};

// New methods for requisition-based PO creation
const createPOFromRequisition = async (
  requisitionId: number,
  supplierId: number,
  expectedDeliveryDate: string,
  createdBy: number,
  notes?: string
): Promise<IPurchaseOrder> => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Get requisition details
    const requisitionResult = await client.query(`
      SELECT r.*, ri.item_id, ri.quantity_expected, ri.unit
      FROM requisitions r
      JOIN requisition_items ri ON r.id = ri.requisition_id
      WHERE r.id = $1
    `, [requisitionId]);

    if (requisitionResult.rows.length === 0) {
      throw new Error('Requisition not found');
    }

    const requisition = requisitionResult.rows[0];
    const items = requisitionResult.rows;

    // Generate PO number
    const poNumber = await generatePONumber();

    // Create purchase order
    const poResult = await client.query(`
      INSERT INTO purchase_orders (
        po_number, supplier_id, order_type, delivery_type,
        expected_delivery_date, central_delivery_location_id, notes, status, total_amount, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      poNumber, supplierId, 'requisition_based', 'single_location',
      expectedDeliveryDate, requisition.delivery_location_id || requisition.source_location_id,
      notes || `PO created from requisition ${requisitionId}`,
      'pending', 0, createdBy
    ]);

    const purchaseOrder = poResult.rows[0];

    // Create PO items
    let totalAmount = 0;
    
    for (const item of items) {
      // Get item cost from items table
      const itemResult = await client.query(
        'SELECT cost_per_unit FROM items WHERE id = $1',
        [item.item_id]
      );

      const unitPrice = itemResult.rows[0]?.cost_per_unit || 0;
      const totalPrice = unitPrice * item.quantity_expected;
      totalAmount += totalPrice;

      await client.query(`
        INSERT INTO purchase_order_items (
          purchase_order_id, item_id, quantity, unit, unit_price,
          total_price, delivery_location_id, requisition_item_ids
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        purchaseOrder.id, item.item_id, item.quantity_expected,
        item.unit, unitPrice, totalPrice, requisition.delivery_location_id || requisition.source_location_id,
        [item.id] // requisition_item_ids array
      ]);
    }

    // Update PO total amount
    await client.query(`
      UPDATE purchase_orders
      SET total_amount = $1
      WHERE id = $2
    `, [totalAmount, purchaseOrder.id]);

    // Create delivery location
    await client.query(`
      INSERT INTO po_delivery_locations (
        purchase_order_id, location_id
      ) VALUES ($1, $2)
    `, [purchaseOrder.id, requisition.delivery_location_id || requisition.source_location_id]);

    await client.query('COMMIT');

    // Return the created PO with items
    const result = await getSinglePurchaseOrder(purchaseOrder.id);
    if (!result) {
      throw new Error('Failed to retrieve created purchase order');
    }
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const createConsolidatedPO = async (
  requisitionIds: number[],
  supplierId: number,
  expectedDeliveryDate: string,
  centralDeliveryLocationId: number,
  createdBy: number,
  notes?: string
): Promise<IPurchaseOrder> => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Get all requisition items
    const requisitionItemsResult = await client.query(`
      SELECT r.id as requisition_id, r.source_location_id, ri.item_id,
             ri.quantity_expected, ri.unit
      FROM requisitions r
      JOIN requisition_items ri ON r.id = ri.requisition_id
      WHERE r.id = ANY($1)
    `, [requisitionIds]);

    if (requisitionItemsResult.rows.length === 0) {
      throw new Error('No requisition items found');
    }

    // Generate PO number
    const poNumber = await generatePONumber();

    // Create purchase order
    const poResult = await client.query(`
      INSERT INTO purchase_orders (
        po_number, supplier_id, order_type, delivery_type,
        expected_delivery_date, central_delivery_location_id, notes,
        status, total_amount, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      poNumber, supplierId, 'consolidated', 'multiple_locations',
      expectedDeliveryDate, centralDeliveryLocationId,
      notes || `Consolidated PO for requisitions: ${requisitionIds.join(', ')}`,
      'pending', 0, createdBy
    ]);

    const purchaseOrder = poResult.rows[0];

    // Group items by location and create PO items
    const locationItems = new Map<number, any[]>();
    for (const item of requisitionItemsResult.rows) {
      if (!locationItems.has(item.source_location_id)) {
        locationItems.set(item.source_location_id, []);
      }
      locationItems.get(item.source_location_id)!.push(item);
    }

    let totalAmount = 0;
    for (const [locationId, items] of locationItems) {
      for (const item of items) {
        // Get item cost from items table
        const itemResult = await client.query(
          'SELECT cost_per_unit FROM items WHERE id = $1',
          [item.item_id]
        );

        const unitPrice = itemResult.rows[0]?.cost_per_unit || 0;
        const totalPrice = unitPrice * item.quantity_expected;
        totalAmount += totalPrice;

        await client.query(`
          INSERT INTO purchase_order_items (
            purchase_order_id, item_id, quantity, unit, unit_price,
            total_price, delivery_location_id, requisition_item_ids
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          purchaseOrder.id, item.item_id, item.quantity_expected,
          item.unit, unitPrice, totalPrice, locationId,
          [item.requisition_id] // requisition_item_ids array
        ]);
      }

      // Create delivery location
      await client.query(`
        INSERT INTO po_delivery_locations (
          purchase_order_id, location_id
        ) VALUES ($1, $2)
      `, [purchaseOrder.id, locationId]);
    }

    // Update PO total amount
    await client.query(`
      UPDATE purchase_orders
      SET total_amount = $1
      WHERE id = $2
    `, [totalAmount, purchaseOrder.id]);

    await client.query('COMMIT');

    // Return the created PO with items
    const result = await getSinglePurchaseOrder(purchaseOrder.id);
    if (!result) {
      throw new Error('Failed to retrieve created purchase order');
    }
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const getPOsByRequisition = async (requisitionId: number): Promise<IPurchaseOrder[]> => {
  const result = await pool.query(`
    SELECT DISTINCT po.*
    FROM purchase_orders po
    JOIN purchase_order_items poi ON po.id = poi.purchase_order_id
    WHERE $1 = ANY(poi.requisition_item_ids)
    ORDER BY po.created_at DESC
  `, [requisitionId]);

  const purchaseOrders = result.rows;

  // Get items and delivery locations for each PO
  for (const po of purchaseOrders) {
    const itemsResult = await pool.query(`
      SELECT poi.*, i.name as item_name, i.description as item_description
      FROM purchase_order_items poi
      LEFT JOIN items i ON poi.item_id = i.id
      WHERE poi.purchase_order_id = $1
    `, [po.id]);
    po.items = itemsResult.rows;

    const deliveryLocationsResult = await pool.query(`
      SELECT pdl.*, l.name as location_name
      FROM po_delivery_locations pdl
      LEFT JOIN locations l ON pdl.location_id = l.id
      WHERE pdl.purchase_order_id = $1
    `, [po.id]);
    po.delivery_locations = deliveryLocationsResult.rows;
  }

  return purchaseOrders;
};

const getPOsBySupplier = async (supplierId: number): Promise<IPurchaseOrder[]> => {
  const result = await pool.query(`
    SELECT po.*, s.name as supplier_name
    FROM purchase_orders po
    LEFT JOIN suppliers s ON po.supplier_id = s.id
    WHERE po.supplier_id = $1
    ORDER BY po.created_at DESC
  `, [supplierId]);

  const purchaseOrders = result.rows;

  // Get items and delivery locations for each PO
  for (const po of purchaseOrders) {
    const itemsResult = await pool.query(`
      SELECT poi.*, i.name as item_name, i.description as item_description
      FROM purchase_order_items poi
      LEFT JOIN items i ON poi.item_id = i.id
      WHERE poi.purchase_order_id = $1
    `, [po.id]);
    po.items = itemsResult.rows;

    const deliveryLocationsResult = await pool.query(`
      SELECT pdl.*, l.name as location_name
      FROM po_delivery_locations pdl
      LEFT JOIN locations l ON pdl.location_id = l.id
      WHERE pdl.purchase_order_id = $1
    `, [po.id]);
    po.delivery_locations = deliveryLocationsResult.rows;
  }

  return purchaseOrders;
};

export const PurchaseOrderService = {
  createPurchaseOrder,
  getSinglePurchaseOrder,
  getAllPurchaseOrders,
  updatePurchaseOrder,
  updatePurchaseOrderStatus,
  deletePurchaseOrder,
  createPOFromRequisition,
  createConsolidatedPO,
  getPOsByRequisition,
  getPOsBySupplier,
};
