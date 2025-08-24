import pool from '../utils/dbClient';

export const name = '1752996000000_create_recipe_ingredients_table';

export const run = async () => {
  // Write your SQL query here
  await pool.query(`
   CREATE TABLE IF NOT EXISTS recipe_ingredients (
    id SERIAL PRIMARY KEY,
    recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    ingredient_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    quantity NUMERIC,
    quantity_unit VARCHAR(50),
    note TEXT,
    is_optional BOOLEAN DEFAULT FALSE,
    substitute_ids INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
   );
  `);
};