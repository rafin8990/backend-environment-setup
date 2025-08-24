import pool from '../utils/dbClient';

export const name = '1753962826285_create_permission_table';

export const run = async () => {
  // Write your SQL query here
  await pool.query(`
    CREATE TABLE permissions (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
  `);
};