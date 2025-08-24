import pool from '../utils/dbClient';

export const name = '1756000000000_update_requisition_items_quantity_to_decimal';

export const run = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Update quantity_expected column to DECIMAL
    await client.query(`
      ALTER TABLE requisition_items 
      ALTER COLUMN quantity_expected TYPE DECIMAL(10,2);
    `);

    // Update quantity_received column to DECIMAL
    await client.query(`
      ALTER TABLE requisition_items 
      ALTER COLUMN quantity_received TYPE DECIMAL(10,2);
    `);

    await client.query('COMMIT');
    console.log('✅ Updated requisition_items table to use DECIMAL for quantities');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error updating requisition_items table:', error);
    throw error;
  } finally {
    client.release();
  }
};
