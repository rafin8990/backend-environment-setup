import pool from '../utils/dbClient';

export const name = '1752729566070_update_recipe_table';

export const run = async () => {
  // Write your SQL query here
  await pool.query(`
    ALTER TABLE recipes
    DROP COLUMN IF EXISTS tag_ids;
  `);
};