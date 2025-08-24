import pool from '../utils/dbClient';

export const name = '1755517060889_add_updated_by_to_stock_transfers';

export const run = async () => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Add updated_by column to stock_transfers table if it doesn't exist
    await client.query(`
      ALTER TABLE stock_transfers 
      ADD COLUMN IF NOT EXISTS updated_by INTEGER REFERENCES users(id);
    `);

    await client.query('COMMIT');
    console.log('✅ Added updated_by column to stock_transfers table successfully');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error adding updated_by column:', error);
    throw error;
  } finally {
    client.release();
  }
};