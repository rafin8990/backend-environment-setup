import pool from '../utils/dbClient';

export const name = '1755509558646_create_location_stocks_table';

export const run = async () => {
  // Create location_stocks table for managing stock quantities per location
  await pool.query(`
    CREATE TABLE IF NOT EXISTS location_stocks (
      id SERIAL PRIMARY KEY,
      location_id INTEGER NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
      item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
      available_quantity NUMERIC(10,3) DEFAULT 0,
      reserved_quantity NUMERIC(10,3) DEFAULT 0,
      allocated_quantity NUMERIC(10,3) DEFAULT 0,
      min_stock NUMERIC(10,3) DEFAULT 0,
      max_stock NUMERIC(10,3) DEFAULT 0,
      last_updated TIMESTAMPTZ DEFAULT NOW(),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(location_id, item_id)
    );
  `);

  // Create indexes for better performance
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_location_stocks_location_id ON location_stocks(location_id);
    CREATE INDEX IF NOT EXISTS idx_location_stocks_item_id ON location_stocks(item_id);
    CREATE INDEX IF NOT EXISTS idx_location_stocks_location_item ON location_stocks(location_id, item_id);
  `);

  // Create trigger to update updated_at timestamp
  await pool.query(`
    CREATE OR REPLACE FUNCTION update_location_stocks_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    $$ language 'plpgsql';
  `);

  await pool.query(`
    DROP TRIGGER IF EXISTS update_location_stocks_updated_at ON location_stocks;
    CREATE TRIGGER update_location_stocks_updated_at
      BEFORE UPDATE ON location_stocks
      FOR EACH ROW
      EXECUTE FUNCTION update_location_stocks_updated_at();
  `);
};
