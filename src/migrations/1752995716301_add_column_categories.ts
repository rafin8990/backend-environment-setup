import pool from '../utils/dbClient';

export const name = '1752995716301_add_column_categories';

export const run = async () => {
  // Write your SQL query here
   await pool.query(`
    ALTER TABLE categories ADD COLUMN description TEXT DEFAULT NULL;
  `);
  await pool.query(`
    ALTER TABLE categories ADD COLUMN image TEXT DEFAULT NULL;
  `);
};