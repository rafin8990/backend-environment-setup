import pool from '../utils/dbClient';

export const name = '1756000000003_add_fields_to_purchase_entry_items';

export const run = async () => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Add missing fields to purchase_entry_items table
    await client.query(`
      ALTER TABLE purchase_entry_items 
      ADD COLUMN IF NOT EXISTS quantity_expected NUMERIC(10,3),
      ADD COLUMN IF NOT EXISTS quantity_received NUMERIC(10,3),
      ADD COLUMN IF NOT EXISTS unit VARCHAR(50);
    `);

    // Update existing records to set quantity_received = quantity and quantity_expected = expected
    await client.query(`
      UPDATE purchase_entry_items 
      SET 
        quantity_received = quantity,
        quantity_expected = COALESCE(expected, quantity)
      WHERE quantity_received IS NULL OR quantity_expected IS NULL;
    `);

    await client.query('COMMIT');
    console.log('✅ Purchase entry items table updated successfully');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error updating purchase entry items table:', error);
    throw error;
  } finally {
    client.release();
  }
};
