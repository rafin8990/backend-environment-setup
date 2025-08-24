import pool from '../utils/dbClient';

export const name = '1756000000001_update_grn_items_add_type_and_expected_costs';

export const run = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Add type field to distinguish between 'grn' (from PO) and 'direct' GRNs
    await client.query(`
      ALTER TABLE grn_items 
      ADD COLUMN grn_type VARCHAR(20) DEFAULT 'direct' CHECK (grn_type IN ('grn', 'direct'));
    `);

    // Add expected cost fields for PO-based GRNs
    await client.query(`
      ALTER TABLE grn_items 
      ADD COLUMN expected_unit_cost NUMERIC(10,2);
    `);

    await client.query(`
      ALTER TABLE grn_items 
      ADD COLUMN expected_total_cost NUMERIC(12,2);
    `);

    // Update existing records to have the default type
    await client.query(`
      UPDATE grn_items 
      SET grn_type = 'direct' 
      WHERE grn_type IS NULL;
    `);

    // Create index for the new type field
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_grn_items_grn_type 
      ON grn_items(grn_type);
    `);

    await client.query('COMMIT');
    console.log('✅ Updated grn_items table with type and expected cost fields');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error updating grn_items table:', error);
    throw error;
  } finally {
    client.release();
  }
};
