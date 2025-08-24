import pool from '../utils/dbClient';

export const name = '1752665136424_update_categories_table';

export const run = async () => {
  // Write your SQL query here
  await pool.query(`
    ALTER TABLE categories
    ADD COLUMN IF NOT EXISTS type_id INT REFERENCES types(id) ON DELETE SET NULL;
  `);
};
