import pool from '../utils/dbClient';

export const name = 'UpdateItemsStockQuantityToDecimal1754000000001';

export const run = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Update stock_quantity column from INT to DECIMAL(10,2)
    await client.query(`
      ALTER TABLE items 
      ALTER COLUMN stock_quantity TYPE DECIMAL(10,2) USING stock_quantity::DECIMAL(10,2)
    `);

    // Update min_stock and max_stock columns as well for consistency
    await client.query(`
      ALTER TABLE items 
      ALTER COLUMN min_stock TYPE DECIMAL(10,2) USING min_stock::DECIMAL(10,2)
    `);

    await client.query(`
      ALTER TABLE items 
      ALTER COLUMN max_stock TYPE DECIMAL(10,2) USING max_stock::DECIMAL(10,2)
    `);

    await client.query('COMMIT');
    console.log('✅ Items table stock_quantity, min_stock, and max_stock columns updated to DECIMAL(10,2)');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error updating items table stock columns:', error);
    throw error;
  } finally {
    client.release();
  }
};
