import pool from '../utils/dbClient';

export const name = '1752646592484_menu_items_update';

export const run = async () => {
  // Write your SQL query here
  await pool.query(`
     ALTER TABLE menu_items
    DROP COLUMN IF EXISTS children_title,
    DROP COLUMN IF EXISTS children_url,
    DROP COLUMN IF EXISTS children_icon;
  `);
};
