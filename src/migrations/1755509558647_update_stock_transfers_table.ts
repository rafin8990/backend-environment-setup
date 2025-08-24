import pool from '../utils/dbClient';

export const name = '1755509558647_update_stock_transfers_table';

export const run = async () => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Add new columns to stock_transfers table
    await client.query(`
      ALTER TABLE stock_transfers 
      ADD COLUMN IF NOT EXISTS purchase_order_id INTEGER REFERENCES purchase_orders(id),
      ADD COLUMN IF NOT EXISTS updated_by INTEGER REFERENCES users(id);
    `);

    // Update transfer_type constraint to include 'po_distribution'
    // First drop the existing check constraint
    await client.query(`
      ALTER TABLE stock_transfers 
      DROP CONSTRAINT IF EXISTS stock_transfers_transfer_type_check;
    `);

    // Add new check constraint with updated values
    await client.query(`
      ALTER TABLE stock_transfers 
      ADD CONSTRAINT stock_transfers_transfer_type_check 
      CHECK (transfer_type IN ('manual', 'requisition_fulfillment', 'production_output', 'replenishment', 'po_distribution'));
    `);

    // Add new indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_stock_transfers_purchase_order_id ON stock_transfers(purchase_order_id);
      CREATE INDEX IF NOT EXISTS idx_stock_transfers_requisition_id ON stock_transfers(requisition_id);
    `);

    await client.query('COMMIT');
    console.log('✅ Stock transfers table updated successfully');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error updating stock transfers table:', error);
    throw error;
  } finally {
    client.release();
  }
};
