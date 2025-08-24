import { generateTransferNumber } from '../../../helpers/transferNumberHelper';
import pool from '../../../utils/dbClient';
import { IStockTransfer, IStockTransferCreate, IStockTransferFilters, IStockTransferUpdate } from './stockTransfers.interface';

class StockTransferService {
  async createStockTransfer(data: IStockTransferCreate): Promise<IStockTransfer> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Generate transfer number if not provided
      const transferNumber = data.transfer_number || await generateTransferNumber('ST');

      // Insert stock transfer
      const transferResult = await client.query(`
        INSERT INTO stock_transfers (
          transfer_number, source_location_id, destination_location_id, 
          transfer_type, purchase_order_id, requisition_id, notes, 
          created_by, approved_by, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `, [
        transferNumber, data.source_location_id, data.destination_location_id,
        data.transfer_type, data.purchase_order_id || null, data.requisition_id || null,
        data.notes, data.created_by, data.approved_by, data.updated_by
      ]);

      const stockTransfer = transferResult.rows[0];

      // Insert stock transfer items
      for (const item of data.items) {
        await client.query(`
          INSERT INTO stock_transfer_items (
            stock_transfer_id, item_id, quantity_requested, quantity_dispatched,
            quantity_received, unit, batch_number, expiry_date, cost_per_unit, notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [
          stockTransfer.id, item.item_id, item.quantity_requested,
          item.quantity_dispatched, item.quantity_received, item.unit,
          item.batch_number, item.expiry_date, item.cost_per_unit, item.notes
        ]);
      }

      await client.query('COMMIT');

      // Return the created stock transfer with items
      const result = await this.getStockTransferById(stockTransfer.id);
      if (!result) {
        throw new Error('Failed to retrieve created stock transfer');
      }
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getStockTransferById(id: number): Promise<IStockTransfer | null> {
    const result = await pool.query(`
      SELECT 
        st.*,
        sl.name as source_location_name,
        dl.name as destination_location_name,
        u1.name as creator_name,
        u2.name as approver_name,
        u3.name as updater_name
      FROM stock_transfers st
      LEFT JOIN locations sl ON st.source_location_id = sl.id
      LEFT JOIN locations dl ON st.destination_location_id = dl.id
      LEFT JOIN users u1 ON st.created_by = u1.id
      LEFT JOIN users u2 ON st.approved_by = u2.id
      LEFT JOIN users u3 ON st.updated_by = u3.id
      WHERE st.id = $1
    `, [id]);

    if (result.rows.length === 0) return null;

    const stockTransfer = result.rows[0];

    // Get items
    const itemsResult = await pool.query(`
      SELECT sti.*, i.name as item_name, i.description as item_description
      FROM stock_transfer_items sti
      LEFT JOIN items i ON sti.item_id = i.id
      WHERE sti.stock_transfer_id = $1
    `, [id]);

    stockTransfer.items = itemsResult.rows;
    return stockTransfer;
  }

  async getAllStockTransfers(filters: IStockTransferFilters = {}): Promise<IStockTransfer[]> {
    let query = `
      SELECT 
        st.*,
        sl.name as source_location_name,
        dl.name as destination_location_name,
        u1.name as creator_name,
        u2.name as approver_name,
        u3.name as updater_name
      FROM stock_transfers st
      LEFT JOIN locations sl ON st.source_location_id = sl.id
      LEFT JOIN locations dl ON st.destination_location_id = dl.id
      LEFT JOIN users u1 ON st.created_by = u1.id
      LEFT JOIN users u2 ON st.approved_by = u2.id
      LEFT JOIN users u3 ON st.updated_by = u3.id
    `;

    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (filters.source_location_id) {
      conditions.push(`st.source_location_id = $${paramIndex}`);
      values.push(filters.source_location_id);
      paramIndex++;
    }

    if (filters.destination_location_id) {
      conditions.push(`st.destination_location_id = $${paramIndex}`);
      values.push(filters.destination_location_id);
      paramIndex++;
    }

    if (filters.status) {
      conditions.push(`st.status = $${paramIndex}`);
      values.push(filters.status);
      paramIndex++;
    }

    if (filters.transfer_type) {
      conditions.push(`st.transfer_type = $${paramIndex}`);
      values.push(filters.transfer_type);
      paramIndex++;
    }

    if (filters.purchase_order_id) {
      conditions.push(`st.purchase_order_id = $${paramIndex}`);
      values.push(filters.purchase_order_id);
      paramIndex++;
    }

    if (filters.requisition_id) {
      conditions.push(`st.requisition_id = $${paramIndex}`);
      values.push(filters.requisition_id);
      paramIndex++;
    }

    if (filters.created_by) {
      conditions.push(`st.created_by = $${paramIndex}`);
      values.push(filters.created_by);
      paramIndex++;
    }

    if (filters.searchTerm) {
      conditions.push(`(
        st.transfer_number ILIKE $${paramIndex} OR
        sl.name ILIKE $${paramIndex} OR
        dl.name ILIKE $${paramIndex}
      )`);
      values.push(`%${filters.searchTerm}%`);
      paramIndex++;
    }

    if (filters.start_date) {
      conditions.push(`st.created_at >= $${paramIndex}`);
      values.push(filters.start_date);
      paramIndex++;
    }

    if (filters.end_date) {
      conditions.push(`st.created_at <= $${paramIndex}`);
      values.push(filters.end_date);
      paramIndex++;
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ` ORDER BY st.created_at DESC`;

    const result = await pool.query(query, values);
    const stockTransfers = result.rows;

    // Get items for each stock transfer
    for (const transfer of stockTransfers) {
      const itemsResult = await pool.query(`
        SELECT sti.*, i.name as item_name, i.description as item_description
        FROM stock_transfer_items sti
        LEFT JOIN items i ON sti.item_id = i.id
        WHERE sti.stock_transfer_id = $1
      `, [transfer.id]);
      transfer.items = itemsResult.rows;
    }

    return stockTransfers;
  }

  async updateStockTransfer(id: number, data: IStockTransferUpdate): Promise<IStockTransfer | null> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Update stock transfer
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (data.status !== undefined) {
        updateFields.push(`status = $${paramIndex}`);
        values.push(data.status);
        paramIndex++;
      }

      if (data.transfer_type !== undefined) {
        updateFields.push(`transfer_type = $${paramIndex}`);
        values.push(data.transfer_type);
        paramIndex++;
      }

      if (data.purchase_order_id !== undefined) {
        updateFields.push(`purchase_order_id = $${paramIndex}`);
        values.push(data.purchase_order_id);
        paramIndex++;
      }

      if (data.requisition_id !== undefined) {
        updateFields.push(`requisition_id = $${paramIndex}`);
        values.push(data.requisition_id);
        paramIndex++;
      }

      if (data.notes !== undefined) {
        updateFields.push(`notes = $${paramIndex}`);
        values.push(data.notes);
        paramIndex++;
      }

      if (data.approved_by !== undefined) {
        updateFields.push(`approved_by = $${paramIndex}`);
        values.push(data.approved_by);
        paramIndex++;
      }

      if (data.updated_by !== undefined) {
        updateFields.push(`updated_by = $${paramIndex}`);
        values.push(data.updated_by);
        paramIndex++;
      }

      if (data.dispatched_at !== undefined) {
        updateFields.push(`dispatched_at = $${paramIndex}`);
        values.push(data.dispatched_at);
        paramIndex++;
      }

      if (data.received_at !== undefined) {
        updateFields.push(`received_at = $${paramIndex}`);
        values.push(data.received_at);
        paramIndex++;
      }

      if (updateFields.length === 0) {
        throw new Error('No fields to update');
      }

      values.push(id);
      const updateResult = await client.query(`
        UPDATE stock_transfers 
        SET ${updateFields.join(', ')}, updated_at = NOW()
        WHERE id = $${paramIndex}
        RETURNING *
      `, values);

      if (updateResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return null;
      }

      // Update items if provided
      if (data.items && data.items.length > 0) {
        for (const item of data.items) {
          if (item.id) {
            // Update existing item
            const itemUpdateFields: string[] = [];
            const itemValues: any[] = [];
            let itemParamIndex = 1;

            if (item.quantity_requested !== undefined) {
              itemUpdateFields.push(`quantity_requested = $${itemParamIndex}`);
              itemValues.push(item.quantity_requested);
              itemParamIndex++;
            }

            if (item.quantity_dispatched !== undefined) {
              itemUpdateFields.push(`quantity_dispatched = $${itemParamIndex}`);
              itemValues.push(item.quantity_dispatched);
              itemParamIndex++;
            }

            if (item.quantity_received !== undefined) {
              itemUpdateFields.push(`quantity_received = $${itemParamIndex}`);
              itemValues.push(item.quantity_received);
              itemParamIndex++;
            }

            if (item.unit !== undefined) {
              itemUpdateFields.push(`unit = $${itemParamIndex}`);
              itemValues.push(item.unit);
              itemParamIndex++;
            }

            if (item.batch_number !== undefined) {
              itemUpdateFields.push(`batch_number = $${itemParamIndex}`);
              itemValues.push(item.batch_number);
              itemParamIndex++;
            }

            if (item.expiry_date !== undefined) {
              itemUpdateFields.push(`expiry_date = $${itemParamIndex}`);
              itemValues.push(item.expiry_date);
              itemParamIndex++;
            }

            if (item.cost_per_unit !== undefined) {
              itemUpdateFields.push(`cost_per_unit = $${itemParamIndex}`);
              itemValues.push(item.cost_per_unit);
              itemParamIndex++;
            }

            if (item.notes !== undefined) {
              itemUpdateFields.push(`notes = $${itemParamIndex}`);
              itemValues.push(item.notes);
              itemParamIndex++;
            }

            if (itemUpdateFields.length > 0) {
              itemValues.push(item.id);
              await client.query(`
                UPDATE stock_transfer_items 
                SET ${itemUpdateFields.join(', ')}, updated_at = NOW()
                WHERE id = $${itemParamIndex}
              `, itemValues);
            }
          }
        }
      }

      await client.query('COMMIT');
      return this.getStockTransferById(id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteStockTransfer(id: number): Promise<boolean> {
    const result = await pool.query('DELETE FROM stock_transfers WHERE id = $1', [id]);
    return (result.rowCount || 0) > 0;
  }

  // New methods for independent workflow - each step can exist without previous steps
  async createIndependentStockTransfer(
    sourceLocationId: number,
    destinationLocationId: number,
    transferType: 'manual' | 'requisition_fulfillment' | 'production_output' | 'replenishment' | 'po_distribution',
    items: Array<{ item_id: number; quantity: number; unit: string; cost_per_unit?: number }>,
    createdBy: number,
    options?: {
      purchase_order_id?: number;
      requisition_id?: number;
      notes?: string;
      status?: 'pending' | 'approved' | 'dispatched' | 'in_transit' | 'received' | 'cancelled';
    }
  ): Promise<IStockTransfer> {
    const transferData: IStockTransferCreate = {
      transfer_number: '', // Will be generated
      source_location_id: sourceLocationId,
      destination_location_id: destinationLocationId,
      transfer_type: transferType,
      status: options?.status || 'pending',
      purchase_order_id: options?.purchase_order_id || null,
      requisition_id: options?.requisition_id || null,
      notes: options?.notes || `Independent stock transfer of type: ${transferType}`,
      created_by: createdBy,
      items: items.map(item => ({
        item_id: item.item_id,
        quantity_requested: item.quantity,
        quantity_dispatched: 0,
        quantity_received: 0,
        unit: item.unit,
        batch_number: null,
        expiry_date: null,
        cost_per_unit: item.cost_per_unit || null,
        notes: null
      }))
    };

    return this.createStockTransfer(transferData);
  }

  // Create stock transfer from GRN (independent of PO)
  async createGRNBasedStockTransfer(
    grnId: number,
    sourceLocationId: number,
    destinationLocationId: number,
    items: Array<{ item_id: number; quantity: number; unit: string; cost_per_unit?: number }>,
    createdBy: number,
    notes?: string
  ): Promise<IStockTransfer> {
    const transferData: IStockTransferCreate = {
      transfer_number: '', // Will be generated
      source_location_id: sourceLocationId,
      destination_location_id: destinationLocationId,
      transfer_type: 'manual', // GRN-based transfers are manual
      status: 'pending',
      notes: notes || `Stock transfer from GRN ${grnId}`,
      created_by: createdBy,
      items: items.map(item => ({
        item_id: item.item_id,
        quantity_requested: item.quantity,
        quantity_dispatched: 0,
        quantity_received: 0,
        unit: item.unit,
        batch_number: null,
        expiry_date: null,
        cost_per_unit: item.cost_per_unit || null,
        notes: null
      }))
    };

    return this.createStockTransfer(transferData);
  }

  // Create stock transfer from purchase entry (independent of PO/GRN)
  async createPEBasedStockTransfer(
    purchaseEntryId: number,
    sourceLocationId: number,
    destinationLocationId: number,
    items: Array<{ item_id: number; quantity: number; unit: string; cost_per_unit?: number }>,
    createdBy: number,
    notes?: string
  ): Promise<IStockTransfer> {
    const transferData: IStockTransferCreate = {
      transfer_number: '', // Will be generated
      source_location_id: sourceLocationId,
      destination_location_id: destinationLocationId,
      transfer_type: 'manual', // PE-based transfers are manual
      status: 'pending',
      notes: notes || `Stock transfer from Purchase Entry ${purchaseEntryId}`,
      created_by: createdBy,
      items: items.map(item => ({
        item_id: item.item_id,
        quantity_requested: item.quantity,
        quantity_dispatched: 0,
        quantity_received: 0,
        unit: item.unit,
        batch_number: null,
        expiry_date: null,
        cost_per_unit: item.cost_per_unit || null,
        notes: null
      }))
    };

    return this.createStockTransfer(transferData);
  }

  // New method for requisition-based stock transfer
  async createStockTransferFromRequisition(
    requisitionId: number,
    sourceLocationId: number,
    destinationLocationId: number,
    items: Array<{ item_id: number; quantity: number; unit: string; cost_per_unit?: number }>,
    createdBy: number,
    notes?: string
  ): Promise<IStockTransfer> {
    const transferData: IStockTransferCreate = {
      transfer_number: '', // Will be generated
      source_location_id: sourceLocationId,
      destination_location_id: destinationLocationId,
      transfer_type: 'requisition_fulfillment',
      status: 'pending',
      notes: notes || `Stock transfer from Requisition ${requisitionId}`,
      created_by: createdBy,
      items: items.map(item => ({
        item_id: item.item_id,
        quantity_requested: item.quantity,
        quantity_dispatched: 0,
        quantity_received: 0,
        unit: item.unit,
        batch_number: null,
        expiry_date: null,
        cost_per_unit: item.cost_per_unit || null,
        notes: null
      }))
    };

    return this.createStockTransfer(transferData);
  }

  // Get stock transfers by various independent sources
  async getStockTransfersByGRN(grnId: number): Promise<IStockTransfer[]> {
    // This would search for stock transfers that reference GRN items
    // Implementation depends on how you want to link them
    const filters: IStockTransferFilters = { 
      searchTerm: `GRN ${grnId}` 
    };
    return this.getAllStockTransfers(filters);
  }

  async getStockTransfersByPurchaseEntry(purchaseEntryId: number): Promise<IStockTransfer[]> {
    // This would search for stock transfers that reference purchase entry
    // Implementation depends on how you want to link them
    const filters: IStockTransferFilters = { 
      searchTerm: `PE ${purchaseEntryId}` 
    };
    return this.getAllStockTransfers(filters);
  }

  // Legacy methods for backward compatibility
  async createPOBasedStockTransfer(
    purchaseOrderId: number, 
    sourceLocationId: number, 
    destinationLocationId: number,
    items: Array<{ item_id: number; quantity: number; unit: string; cost_per_unit?: number }>,
    createdBy: number,
    notes?: string
  ): Promise<IStockTransfer> {
    return this.createIndependentStockTransfer(
      sourceLocationId,
      destinationLocationId,
      'po_distribution',
      items,
      createdBy,
      {
        purchase_order_id: purchaseOrderId,
        notes: notes || `Stock transfer for PO ${purchaseOrderId}`
      }
    );
  }

  async createRequisitionFulfillmentTransfer(
    requisitionId: number,
    sourceLocationId: number,
    destinationLocationId: number,
    items: Array<{ item_id: number; quantity: number; unit: string }>,
    createdBy: number,
    notes?: string
  ): Promise<IStockTransfer> {
    return this.createIndependentStockTransfer(
      sourceLocationId,
      destinationLocationId,
      'requisition_fulfillment',
      items.map(item => ({ ...item, cost_per_unit: undefined })),
      createdBy,
      {
        requisition_id: requisitionId,
        notes: notes || `Stock transfer to fulfill requisition ${requisitionId}`
      }
    );
  }

  async approveStockTransfer(id: number, approvedBy: number): Promise<IStockTransfer | null> {
    return this.updateStockTransfer(id, {
      status: 'approved',
      approved_by: approvedBy,
      updated_by: approvedBy
    });
  }

  async dispatchStockTransfer(id: number, dispatchedBy: number): Promise<IStockTransfer | null> {
    return this.updateStockTransfer(id, {
      status: 'dispatched',
      dispatched_at: new Date().toISOString(),
      updated_by: dispatchedBy
    });
  }

  async receiveStockTransfer(
    id: number, 
    receivedBy: number, 
    receivedItems: Array<{ id: number; quantity_received: number; notes?: string }>
  ): Promise<IStockTransfer | null> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Update stock transfer status
      await client.query(`
        UPDATE stock_transfers 
        SET status = 'received', received_at = NOW(), updated_by = $1
        WHERE id = $2
      `, [receivedBy, id]);

      // Update received quantities for items
      for (const item of receivedItems) {
        await client.query(`
          UPDATE stock_transfer_items 
          SET quantity_received = $1, notes = COALESCE($2, notes), updated_at = NOW()
          WHERE id = $3 AND stock_transfer_id = $4
        `, [item.quantity_received, item.notes, item.id, id]);
      }

      await client.query('COMMIT');
      return this.getStockTransferById(id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

export default new StockTransferService();
