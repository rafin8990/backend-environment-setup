import pool from '../utils/dbClient';

export const name = '1752729822795_update_recipe_tag_table';

export const run = async () => {
  // Write your SQL query here
  await pool.query(`
  CREATE TABLE IF NOT EXISTS recipe_tags (
  recipe_id INTEGER REFERENCES recipes(id) ON DELETE CASCADE,
  tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (recipe_id, tag_id)
);
  `);
};