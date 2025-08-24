import pool from '../utils/dbClient';

export const name = '1752646033543_menu_items';

export const run = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS menu_items (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      url VARCHAR(255),
      icon VARCHAR(255),
      parent_id INT REFERENCES menu_items(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
};