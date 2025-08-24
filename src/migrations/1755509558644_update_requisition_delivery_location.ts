import pool from '../utils/dbClient';

export const name = '1755509558644_update_requisition_delivery_location';

export const run = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // First, get all existing locations to use for mapping
    const locationsResult = await client.query('SELECT id FROM locations LIMIT 1');
    const defaultLocationId = locationsResult.rows[0]?.id || 1;

    // Add the new delivery_location_id column
    await client.query(`
      ALTER TABLE requisitions 
      ADD COLUMN delivery_location_id INTEGER REFERENCES locations(id);
    `);

    // Update existing records to use a default location (you can adjust this logic as needed)
    await client.query(`
      UPDATE requisitions 
      SET delivery_location_id = $1 
      WHERE delivery_location_id IS NULL;
    `, [defaultLocationId]);

    // Make the new column NOT NULL
    await client.query(`
      ALTER TABLE requisitions 
      ALTER COLUMN delivery_location_id SET NOT NULL;
    `);

    // Remove the old delivery_address column
    await client.query(`
      ALTER TABLE requisitions 
      DROP COLUMN delivery_address;
    `);

    // Add index for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_requisitions_delivery_location_id 
      ON requisitions(delivery_location_id);
    `);

    await client.query('COMMIT');
    console.log('✅ Updated requisitions table to use delivery_location_id instead of delivery_address');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error updating requisitions table:', error);
    throw error;
  } finally {
    client.release();
  }
};