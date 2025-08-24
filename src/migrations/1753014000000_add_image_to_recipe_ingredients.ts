import pool from '../utils/dbClient';

export const name = '1753014000000_add_image_to_recipe_ingredients';

export const run = async () => {
  // Add image column to recipe_ingredients table
  await pool.query(`
    ALTER TABLE recipe_ingredients
    ADD COLUMN IF NOT EXISTS image VARCHAR(500);
  `);
};