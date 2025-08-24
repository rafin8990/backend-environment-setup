import pool from '../utils/dbClient';

export const name = '1753011551456_create_stock_table';

export const run = async () => {
  // Write your SQL query here
  await pool.query(`
   CREATE TABLE stocks (
  id SERIAL PRIMARY KEY,
  item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  physical_stock_count NUMERIC NOT NULL,
  note TEXT,
  counted_at TIMESTAMP,
  counted_by INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
  `);
};
