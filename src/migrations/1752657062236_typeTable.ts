import pool from '../utils/dbClient';

export const name = '1752657062236_typeTable';

export const run = async () => {
  // Write your SQL query here
  await pool.query(`
  CREATE TABLE IF NOT EXISTS type_table (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  parent_type_id INT REFERENCES type_table(id) ON DELETE SET NULL
  );
  `);
};
