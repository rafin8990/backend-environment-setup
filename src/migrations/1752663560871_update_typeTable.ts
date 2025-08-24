import pool from '../utils/dbClient';

export const name = '1752663560871_update_typeTable';

export const run = async () => {
  // Write your SQL query here
  await pool.query(`
    ALTER TABLE types
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE types
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
  `);
};