import pool from '../utils/dbClient';

export const name = '1752667078604_create_recipes_table';

export const run = async () => {
  // Write your SQL query here
  await pool.query(`
   CREATE TABLE IF NOT EXISTS recipes (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  yield_quantity NUMERIC,
  yield_unit VARCHAR(50),
  total_weight NUMERIC,
  description TEXT,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
  `);
};