import pool from '../utils/dbClient';

export const name = '1754293847058_update_recipe_table';

export const run = async () => {
  // Write your SQL query here
  await pool.query(`
   ALTER TABLE recipes
ADD COLUMN images TEXT[];
  `);
  await pool.query(`
   ALTER TABLE recipes
ADD COLUMN recipe_code VARCHAR(100);
  `);
  await pool.query(`
   ALTER TABLE recipes
ADD COLUMN instruction TEXT;
  `);
  await pool.query(`
  ALTER TABLE recipes
ADD COLUMN estimated_time VARCHAR(100);

  `);

  await pool.query(`
 ALTER TABLE recipes
ADD COLUMN price NUMERIC;
  `);
};
