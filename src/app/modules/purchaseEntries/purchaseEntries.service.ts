import { paginationHelpers } from '../../../helpers/paginationHelper';
import { IGenericResponse } from '../../../interfaces/common';
import { IPaginationOptions } from '../../../interfaces/pagination';
import pool from '../../../utils/dbClient';
import {
  IPurchaseEntry,
  IPurchaseEntryCreate,
  IPurchaseEntryFilters,
  IPurchaseEntryUpdate
} from './purchaseEntries.interface';

const generatePENumber = async (): Promise<string> => {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const result = await pool.query(
    'SELECT COUNT(*) as count FROM purchase_entries WHERE DATE(created_at) = CURRENT_DATE'
  );
  const count = parseInt(result.rows[0].count);
  return `PE-${date}-${String(count + 1).padStart(3, '0')}`;
};

const createPurchaseEntry = async (data: IPurchaseEntryCreate): Promise<IPurchaseEntry | null> => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Generate PE number if not provided
    const peNumber = data.pe_number || await generatePENumber();

    // Create purchase entry
    const peQuery = `
      INSERT INTO purchase_entries (
        pe_number, po_id, grn_id, amount_paid, payment_status,
        payment_method, payment_reference, attachments, created_by, is_direct_pe
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *;
    `;

    const peValues = [
      peNumber,
      data.po_id || null,
      data.grn_id || null,
      data.amount_paid,
      data.payment_status,
      data.payment_method || null,
      data.payment_reference || null,
      data.attachments || [],
      data.created_by || null,
      data.is_direct_pe,
    ];

    const peResult = await client.query(peQuery, peValues);
    const purchaseEntry = peResult.rows[0];

    // Create purchase entry items if provided
    if (data.items && data.items.length > 0) {
      for (const item of data.items) {
        const itemQuery = `
          INSERT INTO purchase_entry_items (
            pe_id, item_id, quantity, expected, quantity_expected, quantity_received, unit, price, notes,
            requisition_code, batch_number, expiry_date, storage_location, quality_check
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14);
        `;

        const itemValues = [
          purchaseEntry.id,
          item.item_id,
          item.quantity,
          item.quantity_expected || item.expected || item.quantity, // expected column
          item.quantity_expected || item.expected || item.quantity, // quantity_expected column
          item.quantity_received || item.quantity, // quantity_received column
          item.unit || 'kg',
          item.price || null,
          item.notes || null,
          item.requisition_code || null,
          item.batch_number || null,
          item.expiry_date || null,
          item.storage_location || null,
          item.quality_check || 'pending',
        ];

        await client.query(itemQuery, itemValues);
      }
    }

    // Update PO status if linked to PO
    if (data.po_id) {
      await client.query(
        'UPDATE purchase_orders SET status = $1 WHERE id = $2',
        ['completed', data.po_id]
      );
    }

    // Update GRN status if linked to GRN
    if (data.grn_id) {
      await client.query(
        'UPDATE grns SET status = $1 WHERE id = $2',
        ['received', data.grn_id]
      );
    }

    await client.query('COMMIT');
    return await getSinglePurchaseEntry(purchaseEntry.id);

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const getSinglePurchaseEntry = async (id: number): Promise<IPurchaseEntry | null> => {
  const client = await pool.connect();
  
  try {
    // Get purchase entry with related data
    const peQuery = `
      SELECT 
        pe.*,
        po.po_number,
        po.supplier_id as po_supplier_id,
        grn.grn_number,
        grn.destination_location_id as grn_destination_location,
        creator.name as creator_name,
        creator.email as creator_email,
        updater.name as updater_name,
        updater.email as updater_email
      FROM purchase_entries pe
      LEFT JOIN purchase_orders po ON pe.po_id = po.id
      LEFT JOIN grns grn ON pe.grn_id = grn.id
      LEFT JOIN users creator ON pe.created_by = creator.id
      LEFT JOIN users updater ON pe.updated_by = updater.id
      WHERE pe.id = $1;
    `;

    const peResult = await client.query(peQuery, [id]);
    
    if (peResult.rows.length === 0) {
      return null;
    }

    const purchaseEntry = peResult.rows[0];

    // Get purchase entry items with item details
    const itemsQuery = `
      SELECT 
        pei.*,
        i.name as item_name,
        i.description as item_description,
        i.unit as item_unit,
        i.stock_quantity as item_stock_quantity,
        i.image_urls as item_images
      FROM purchase_entry_items pei
      JOIN items i ON pei.item_id = i.id
      WHERE pei.pe_id = $1;
    `;

    const itemsResult = await client.query(itemsQuery, [id]);
    purchaseEntry.items = itemsResult.rows;

    return purchaseEntry;

  } catch (error) {
    throw error;
  } finally {
    client.release();
  }
};

const getAllPurchaseEntries = async (
  filters: IPurchaseEntryFilters,
  paginationOptions: IPaginationOptions
): Promise<IGenericResponse<Array<IPurchaseEntry>>> => {
  const { 
    searchTerm, 
    po_id, 
    grn_id,
    payment_status,
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
      'pe.pe_number', 
      'pe.payment_reference',
      'po.po_number',
      'g.grn_number'
    ];
    const searchClause = searchableFields.map(
      field => `${field} ILIKE $${paramIndex++}`
    ).join(' OR ');
    values.push(...searchableFields.map(() => `%${searchTerm}%`));
    conditions.push(`(${searchClause})`);
  }

  // Filter by po_id
  if (po_id) {
    conditions.push(`pe.po_id = $${paramIndex}`);
    values.push(Number(po_id));
    paramIndex++;
  }

  // Filter by grn_id
  if (grn_id) {
    conditions.push(`pe.grn_id = $${paramIndex}`);
    values.push(Number(grn_id));
    paramIndex++;
  }

  // Filter by payment_status
  if (payment_status) {
    conditions.push(`pe.payment_status = $${paramIndex}`);
    values.push(payment_status);
    paramIndex++;
  }

  // Filter by created_by
  if (created_by) {
    conditions.push(`pe.created_by = $${paramIndex}`);
    values.push(Number(created_by));
    paramIndex++;
  }

  // Filter by date range
  if (start_date) {
    conditions.push(`pe.created_at >= $${paramIndex}`);
    values.push(start_date);
    paramIndex++;
  }

  if (end_date) {
    conditions.push(`pe.created_at <= $${paramIndex}`);
    values.push(end_date);
    paramIndex++;
  }

  // Handle other filter fields
  for (const [field, value] of Object.entries(filterFields)) {
    if (value !== undefined && value !== null) {
      conditions.push(`pe.${field} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const query = `
    SELECT 
      pe.*,
      po.po_number as po_number,
      g.grn_number as grn_number,
      u.name as creator_name
    FROM purchase_entries pe
    LEFT JOIN purchase_orders po ON pe.po_id = po.id
    LEFT JOIN grns g ON pe.grn_id = g.id
    LEFT JOIN users u ON pe.created_by = u.id
    ${whereClause}
    ORDER BY pe.${sortBy} ${sortOrder}
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1};
  `;

  values.push(limit, skip);
  const result = await pool.query(query, values);

  // Get items for each purchase entry
  const purchaseEntriesWithItems = await Promise.all(
    result.rows.map(async (pe) => {
      const itemsQuery = `
        SELECT 
          pei.*,
          i.name as item_name,
          i.description as item_description,
          i.unit as item_unit,
          i.stock_quantity as item_stock_quantity,
          i.image_urls as item_images
        FROM purchase_entry_items pei
        JOIN items i ON pei.item_id = i.id
        WHERE pei.pe_id = $1;
      `;
      
      const itemsResult = await pool.query(itemsQuery, [pe.id]);
      return { ...pe, items: itemsResult.rows };
    })
  );

  // Get total count
  const countQuery = `
    SELECT COUNT(*) as total
    FROM purchase_entries pe
    LEFT JOIN purchase_orders po ON pe.po_id = po.id
    LEFT JOIN grns g ON pe.grn_id = g.id
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
    data: purchaseEntriesWithItems,
  };
};

const updatePurchaseEntry = async (
  id: number,
  updateData: IPurchaseEntryUpdate
): Promise<IPurchaseEntry | null> => {
  const client = await pool.connect();
  
  try {
    const result = await client.query(`
      UPDATE purchase_entries 
      SET 
        amount_paid = COALESCE($1, amount_paid),
        payment_status = COALESCE($2, payment_status),
        payment_method = COALESCE($3, payment_method),
        payment_reference = COALESCE($4, payment_reference),
        updated_at = NOW()
      WHERE id = $5
      RETURNING *
    `, [
      updateData.amount_paid,
      updateData.payment_status,
      updateData.payment_method,
      updateData.payment_reference,
      id
    ]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return await getSinglePurchaseEntry(id);
  } finally {
    client.release();
  }
};

const updatePaymentStatus = async (
  id: number,
  paymentStatus: string,
  paymentMethod?: string,
  paymentReference?: string
): Promise<IPurchaseEntry | null> => {
  const client = await pool.connect();
  
  try {
    const result = await client.query(`
      UPDATE purchase_entries 
      SET payment_status = $1, payment_method = $2, payment_reference = $3, updated_at = NOW()
      WHERE id = $4
      RETURNING *
    `, [paymentStatus, paymentMethod, paymentReference, id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return await getSinglePurchaseEntry(id);
  } finally {
    client.release();
  }
};

// New method for GRN-based PE creation
const createPEFromGRN = async (
  grnId: number,
  amountPaid: number,
  paymentStatus: 'pending' | 'partial' | 'completed',
  paymentMethod?: string,
  paymentReference?: string,
  notes?: string,
  created_by?: number
): Promise<IPurchaseEntry | null> => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Get GRN details
    const grnResult = await client.query(`
      SELECT g.*, gi.item_id, gi.quantity_received, gi.unit_cost
      FROM grns g
      JOIN grn_items gi ON g.id = gi.grn_id
      WHERE g.id = $1
    `, [grnId]);

    if (grnResult.rows.length === 0) {
      throw new Error('GRN not found');
    }

    const grnItems = grnResult.rows;

    // Generate PE number
    const peNumber = await generatePENumber();

    // Get GRN with PO ID
    const grnWithPO = await client.query(`
      SELECT g.*, po.id as po_id, po.po_number
      FROM grns g
      LEFT JOIN purchase_orders po ON g.purchase_order_id = po.id
      WHERE g.id = $1
    `, [grnId]);

    if (grnWithPO.rows.length === 0) {
      throw new Error('GRN not found');
    }

    const grnData = grnWithPO.rows[0];

    // Create purchase entry
    const peQuery = `
      INSERT INTO purchase_entries (
        pe_number, po_id, grn_id, amount_paid, payment_status,
        payment_method, payment_reference, created_by, is_direct_pe
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *;
    `;

    const peValues = [
      peNumber,
      grnData.po_id || null,
      grnId,
      amountPaid,
      paymentStatus,
      paymentMethod || null,
      paymentReference || null,
      created_by || null,
      false
    ];

    const peResult = await client.query(peQuery, peValues);
    const purchaseEntry = peResult.rows[0];

    // Create purchase entry items from GRN items
    const peItems = grnItems.map(item => ({
      item_id: item.item_id,
      quantity: item.quantity_received,
      quantity_expected: item.quantity_expected || item.quantity_received,
      quantity_received: item.quantity_received,
      unit: 'kg', // Default unit
      price: item.unit_cost,
      notes: notes || `PE created from GRN ${grnId}`,
      batch_number: null,
      expiry_date: null,
      storage_location: null,
      quality_check: 'pending' as const
    }));

    for (const item of peItems) {
      const itemQuery = `
        INSERT INTO purchase_entry_items (
          pe_id, item_id, quantity, expected, quantity_expected, quantity_received, unit, price, notes,
          requisition_code, batch_number, expiry_date, storage_location, quality_check
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14);
      `;

      const itemValues = [
        purchaseEntry.id,
        item.item_id,
        item.quantity,
        item.quantity_expected, // expected column
        item.quantity_expected, // quantity_expected column
        item.quantity_received, // quantity_received column
        item.unit,
        item.price || null,
        item.notes || null,
        null, // requisition_code
        item.batch_number || null,
        item.expiry_date || null,
        item.storage_location || null,
        item.quality_check || 'pending'
      ];

      await client.query(itemQuery, itemValues);
    }

    // Update GRN status
    await client.query(
      'UPDATE grns SET status = $1 WHERE id = $2',
      ['received', grnId]
    );

    await client.query('COMMIT');
    return await getSinglePurchaseEntry(purchaseEntry.id);

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// New method for PO-based PE creation (bypass GRN)
const createPEFromPO = async (
  poId: number,
  amountPaid: number,
  paymentStatus: 'pending' | 'partial' | 'completed',
  paymentMethod?: string,
  paymentReference?: string,
  notes?: string,
  created_by?: number
): Promise<IPurchaseEntry | null> => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Get PO details
    const poResult = await client.query(`
      SELECT po.*, poi.item_id, poi.quantity, poi.unit_price
      FROM purchase_orders po
      JOIN purchase_order_items poi ON po.id = poi.purchase_order_id
      WHERE po.id = $1
    `, [poId]);

    if (poResult.rows.length === 0) {
      throw new Error('Purchase order not found');
    }

    const poItems = poResult.rows;

    // Generate PE number
    const peNumber = await generatePENumber();

    // Create purchase entry
    const peQuery = `
      INSERT INTO purchase_entries (
        pe_number, po_id, amount_paid, payment_status,
        payment_method, payment_reference, created_by, is_direct_pe
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *;
    `;

    const peValues = [
      peNumber,
      poId,
      amountPaid,
      paymentStatus,
      paymentMethod || null,
      paymentReference || null,
      created_by || null,
      false
    ];

    const peResult = await client.query(peQuery, peValues);
    const purchaseEntry = peResult.rows[0];

    // Create purchase entry items from PO items
    const peItems = poItems.map(item => ({
      item_id: item.item_id,
      quantity: item.quantity,
      quantity_expected: item.quantity,
      quantity_received: item.quantity,
      unit: 'kg', // Default unit
      price: item.unit_price,
      notes: notes || `PE created from PO ${poId}`,
      batch_number: null,
      expiry_date: null,
      storage_location: null,
      quality_check: 'pending' as const
    }));

    for (const item of peItems) {
              const itemQuery = `
          INSERT INTO purchase_entry_items (
            pe_id, item_id, quantity, expected, quantity_expected, quantity_received, unit, price, notes,
            requisition_code, batch_number, expiry_date, storage_location, quality_check
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14);
        `;

      const itemValues = [
        purchaseEntry.id,
        item.item_id,
        item.quantity,
        item.quantity_expected, // expected column
        item.quantity_expected, // quantity_expected column
        item.quantity_received, // quantity_received column
        item.unit,
        item.price || null,
        item.notes || null,
        null, // requisition_code
        item.batch_number || null,
        item.expiry_date || null,
        item.storage_location || null,
        item.quality_check || 'pending',
      ];

      await client.query(itemQuery, itemValues);
    }

    // Update PO status
    await client.query(
      'UPDATE purchase_orders SET status = $1 WHERE id = $2',
      ['completed', poId]
    );

    await client.query('COMMIT');
    return await getSinglePurchaseEntry(purchaseEntry.id);

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Add missing deletePurchaseEntry method
const deletePurchaseEntry = async (id: number): Promise<IPurchaseEntry | null> => {
  const client = await pool.connect();
  
  try {
    const result = await client.query('DELETE FROM purchase_entries WHERE id = $1 RETURNING *', [id]);
    return result.rows.length > 0 ? result.rows[0] : null;
  } finally {
    client.release();
  }
};

export const PurchaseEntryService = {
  createPurchaseEntry,
  getSinglePurchaseEntry,
  getAllPurchaseEntries,
  updatePurchaseEntry,
  updatePaymentStatus,
  createPEFromGRN,
  createPEFromPO,
  deletePurchaseEntry,
};
