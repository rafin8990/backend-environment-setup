import pool from '../utils/dbClient';

export const name = '1752751005594_create_location_table';

export const run = async () => {
  // Create `locations` table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS locations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      type VARCHAR(100) NOT NULL, -- e.g., 'Warehouse', 'Refrigerator'
      temperature_controlled BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // Create `location_default_categories` table with correct syntax
  await pool.query(`
    CREATE TABLE IF NOT EXISTS location_default_categories (
      location_id INTEGER NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
      category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
      PRIMARY KEY (location_id, category_id)
    );
  `);
};
