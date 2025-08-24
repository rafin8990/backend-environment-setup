import pool from '../utils/dbClient';

export const name = '1755509558645_add_location_id_to_stocks_table';

export const run = async () => {
  // Add location_id column to stocks table
  await pool.query(`
    ALTER TABLE stocks 
    ADD COLUMN IF NOT EXISTS location_id INTEGER REFERENCES locations(id);
  `);

  // Set default location for existing stock records (assuming Central Warehouse has ID 1)
  await pool.query(`
    UPDATE stocks 
    SET location_id = 1 
    WHERE location_id IS NULL;
  `);

  // Make location_id NOT NULL after setting default values
  await pool.query(`
    ALTER TABLE stocks 
    ALTER COLUMN location_id SET NOT NULL;
  `);

  // Create index for better performance
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_stocks_location_id ON stocks(location_id);
    CREATE INDEX IF NOT EXISTS idx_stocks_item_location ON stocks(item_id, location_id);
  `);
};
