import pool from '../utils/dbClient';

export const name = '1753953058594_create_users_table';

export const run = async () => {
  // Write your SQL query here
  await pool.query(`
    -- Example: ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT true;
  `);
};