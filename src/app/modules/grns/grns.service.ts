import { paginationHelpers } from '../../../helpers/paginationHelper';
import { IGenericResponse } from '../../../interfaces/common';
import { IPaginationOptions } from '../../../interfaces/pagination';
import pool from '../../../utils/dbClient';
import {
  IGRN,
  IGRNCreate,
  IGRNFilters,
  IGRNUpdate
} from './grns.interface';

const generateGRNNumber = async (): Promise<string> => {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const result = await pool.query(
    'SELECT COUNT(*) as count FROM grns WHERE DATE(created_at) = CURRENT_DATE'
  );
  const count = parseInt(result.rows[0].count);
  return `GRN-${date}-${String(count + 1).padStart(3, '0')}`;
};

const createGRN = async (data: IGRNCreate): Promise<IGRN | null> => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Generate GRN number if not provided
    const grnNumber = data.grn_number || await generateGRNNumber();

    // Create GRN
    const grnQuery = `
      INSERT INTO grns (
        grn_number, batch_id, purchase_order_id, received_at, destination_location_id,
        status, invoice_number, delivery_notes, attachments, subtotal_amount,
        discount_amount, total_amount, receiver_id, is_direct_grn
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *;
    `;

    const grnValues = [
      grnNumber,
      `BATCH-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      data.purchase_order_id || null,
      data.received_at,
      data.destination_location_id,
      data.status,
      data.invoice_number || null,
      data.delivery_notes || null,
      data.attachments || [],
      data.subtotal_amount,
      data.discount_amount,
      data.total_amount,
      data.receiver_id || null,
      data.is_direct_grn,
    ];

    const grnResult = await client.query(grnQuery, grnValues);
    const grn = grnResult.rows[0];

    // Create GRN items
    for (const item of data.items) {
      const itemQuery = `
        INSERT INTO grn_items (
          grn_id, item_id, quantity_expected, quantity_received,
          batch_number, expiry_date, type, grn_type, reject_reason, notes,
          expected_unit_cost, expected_total_cost, unit_cost, total_cost
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14);
      `;

      const itemValues = [
        grn.id,
        item.item_id,
        item.quantity_expected || null,
        item.quantity_received,
        item.batch_number || null,
        item.expiry_date || null,
        item.type,
        item.grn_type || 'direct',
        item.reject_reason || null,
        item.notes || null,
        item.expected_unit_cost || null,
        item.expected_total_cost || null,
        item.unit_cost,
        item.total_cost,
      ];

      await client.query(itemQuery, itemValues);
    }

    // Update PO status if linked to PO
    if (data.purchase_order_id) {
      await client.query(
        'UPDATE purchase_orders SET status = $1 WHERE id = $2',
        ['partially_received', data.purchase_order_id]
      );
    }

    await client.query('COMMIT');
    return await getSingleGRN(grn.id);

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const getSingleGRN = async (id: number): Promise<IGRN | null> => {
  const result = await pool.query(`
    SELECT 
      g.*,
      po.po_number as po_number,
      po.supplier_id as po_supplier_id,
      l.name as destination_location_name,
      l.description as destination_location_description,
      u.name as receiver_name,
      u.email as receiver_email
    FROM grns g
    LEFT JOIN purchase_orders po ON g.purchase_order_id = po.id
    LEFT JOIN locations l ON g.destination_location_id = l.id
    LEFT JOIN users u ON g.receiver_id = u.id
    WHERE g.id = $1
  `, [id]);

  if (result.rows.length === 0) {
    return null;
  }

  const grn = result.rows[0];

  // Get items
  const itemsResult = await pool.query(`
    SELECT 
      gi.*,
      i.name as item_name,
      i.description as item_description,
      i.image_urls as item_images
    FROM grn_items gi
    LEFT JOIN items i ON gi.item_id = i.id
    WHERE gi.grn_id = $1
  `, [id]);

  return {
    ...grn,
    items: itemsResult.rows,
  };
};

const getAllGRNs = async (
  filters: IGRNFilters,
  paginationOptions: IPaginationOptions
): Promise<IGenericResponse<Array<IGRN>>> => {
  const { 
    searchTerm, 
    batch_id,
    purchase_order_id, 
    destination_location_id,
    status,
    receiver_id,
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
      'g.grn_number', 
      'g.batch_id',
      'g.invoice_number',
      'g.delivery_notes'
    ];
    const searchClause = searchableFields.map(
      field => `${field} ILIKE $${paramIndex++}`
    ).join(' OR ');
    values.push(...searchableFields.map(() => `%${searchTerm}%`));
    conditions.push(`(${searchClause})`);
  }

  // Filter by batch_id
  if (batch_id) {
    conditions.push(`g.batch_id = $${paramIndex}`);
    values.push(batch_id);
    paramIndex++;
  }

  // Filter by purchase_order_id
  if (purchase_order_id) {
    conditions.push(`g.purchase_order_id = $${paramIndex}`);
    values.push(Number(purchase_order_id));
    paramIndex++;
  }

  // Filter by destination_location_id
  if (destination_location_id) {
    conditions.push(`g.destination_location_id = $${paramIndex}`);
    values.push(Number(destination_location_id));
    paramIndex++;
  }

  // Filter by status
  if (status) {
    conditions.push(`g.status = $${paramIndex}`);
    values.push(status);
    paramIndex++;
  }

  // Filter by receiver_id
  if (receiver_id) {
    conditions.push(`g.receiver_id = $${paramIndex}`);
    values.push(Number(receiver_id));
    paramIndex++;
  }

  // Filter by date range
  if (start_date) {
    conditions.push(`g.received_at >= $${paramIndex}`);
    values.push(start_date);
    paramIndex++;
  }

  if (end_date) {
    conditions.push(`g.received_at <= $${paramIndex}`);
    values.push(end_date);
    paramIndex++;
  }

  // Handle other filter fields
  for (const [field, value] of Object.entries(filterFields)) {
    if (value !== undefined && value !== null) {
      conditions.push(`g.${field} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const query = `
    SELECT 
      g.*,
      l.name as destination_location_name,
      u.name as receiver_name
    FROM grns g
    LEFT JOIN locations l ON g.destination_location_id = l.id
    LEFT JOIN users u ON g.receiver_id = u.id
    ${whereClause}
    ORDER BY g.${sortBy} ${sortOrder}
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1};
  `;

  values.push(limit, skip);
  const result = await pool.query(query, values);

  // Get total count
  const countQuery = `
    SELECT COUNT(*) as total
    FROM grns g
    ${whereClause};
  `;
  
  const countResult = await pool.query(countQuery, values.slice(0, -2));
  const total = parseInt(countResult.rows[0].total);

  return {
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    data: result.rows,
  };
};

const updateGRN = async (
  id: number,
  updateData: IGRNUpdate
): Promise<IGRN | null> => {
  const result = await pool.query(
    `UPDATE grns 
     SET ${Object.keys(updateData).map((key, index) => `${key} = $${index + 2}`).join(', ')}, updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id, ...Object.values(updateData)]
  );

  return result.rows.length > 0 ? await getSingleGRN(id) : null;
};

const updateGRNStatus = async (
  id: number,
  status: string,
  receiver_id?: number
): Promise<IGRN | null> => {
  const updateData: any = { status };
  if (receiver_id) {
    updateData.receiver_id = receiver_id;
  }

  return await updateGRN(id, updateData);
};

const deleteGRN = async (id: number): Promise<IGRN | null> => {
  const result = await pool.query('DELETE FROM grns WHERE id = $1 RETURNING *', [id]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

// New method for PO-based GRN creation
const createGRNFromPO = async (
  purchaseOrderId: number,
  receivedAt: string,
  destinationLocationId: number,
  items: Array<{
    item_id: number;
    quantity_expected: number;
    quantity_received: number;
    batch_number?: string;
    expiry_date?: string;
    type: 'perishable' | 'non_perishable';
    reject_reason?: string;
    notes?: string;
    unit_cost: number;
    total_cost: number;
  }>,
  receiverId?: number | null,
  notes?: string
): Promise<IGRN | null> => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Get PO details
    const poResult = await client.query(`
      SELECT po.*, poi.item_id, poi.quantity, poi.unit_price
      FROM purchase_orders po
      JOIN purchase_order_items poi ON po.id = poi.purchase_order_id
      WHERE po.id = $1
    `, [purchaseOrderId]);

    if (poResult.rows.length === 0) {
      throw new Error('Purchase order not found');
    }

    // Generate GRN number
    const grnNumber = await generateGRNNumber();

    // Calculate totals
    const subtotalAmount = items.reduce((sum, item) => sum + item.total_cost, 0);
    const discountAmount = 0; // Can be enhanced later
    const totalAmount = subtotalAmount - discountAmount;

    // Create GRN
    const grnResult = await client.query(`
      INSERT INTO grns (
        grn_number, batch_id, purchase_order_id, received_at, destination_location_id,
        status, delivery_notes, subtotal_amount, discount_amount, total_amount,
        receiver_id, is_direct_grn
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [
      grnNumber, 
      `BATCH-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      purchaseOrderId, receivedAt, destinationLocationId,
      'received', notes || `GRN created from PO ${purchaseOrderId}`,
      subtotalAmount, discountAmount, totalAmount, receiverId, false
    ]);

    const grn = grnResult.rows[0];

    // Create GRN items
    for (const item of items) {
      // Get PO item details for expected quantities and costs
      const poItem = poResult.rows.find(poi => poi.item_id === item.item_id);
      
      await client.query(`
        INSERT INTO grn_items (
          grn_id, item_id, quantity_expected, quantity_received,
          batch_number, expiry_date, type, grn_type, reject_reason, notes,
          expected_unit_cost, expected_total_cost, unit_cost, total_cost
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      `, [
        grn.id, item.item_id, 
        poItem ? poItem.quantity : null, // quantity_expected from PO
        item.quantity_received,
        item.batch_number || null, item.expiry_date || null, item.type,
        'grn', // grn_type for PO-based GRNs
        item.reject_reason || null, item.notes || null,
        poItem ? poItem.unit_price : null, // expected_unit_cost from PO
        poItem ? (poItem.quantity * poItem.unit_price) : null, // expected_total_cost from PO
        item.unit_cost, item.total_cost
      ]);
    }

    // Update PO status
    await client.query(`
      UPDATE purchase_orders SET status = $1 WHERE id = $2
    `, ['partially_received', purchaseOrderId]);

    await client.query('COMMIT');
    return await getSingleGRN(grn.id);

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const GRNService = {
  createGRN,
  getSingleGRN,
  getAllGRNs,
  updateGRN,
  updateGRNStatus,
  deleteGRN,
  createGRNFromPO,
};
