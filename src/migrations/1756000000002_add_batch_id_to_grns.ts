import pool from '../utils/dbClient';

export const name = '1756000000002_add_batch_id_to_grns';

export const run = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Add batch_id column to grns table (without unique constraint initially)
    await client.query(`
      ALTER TABLE grns 
      ADD COLUMN batch_id VARCHAR(50);
    `);

    // Update existing records with unique batch IDs
    await client.query(`
      UPDATE grns 
      SET batch_id = 'BATCH-' || EXTRACT(EPOCH FROM created_at)::BIGINT || '-' || id;
    `);

    // Now add the unique constraint
    await client.query(`
      ALTER TABLE grns 
      ALTER COLUMN batch_id SET NOT NULL;
    `);

    await client.query(`
      ALTER TABLE grns 
      ADD CONSTRAINT grns_batch_id_unique UNIQUE (batch_id);
    `);

    // Create index for batch_id
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_grns_batch_id 
      ON grns(batch_id);
    `);

    await client.query('COMMIT');
    console.log('✅ Added batch_id field to grns table');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error adding batch_id to grns table:', error);
    throw error;
  } finally {
    client.release();
  }
};
