import pool from '../utils/dbClient';

export const name = '1753017000000_create_low_stock_alerts_table';

export const run = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS low_stock_alerts (
      id SERIAL PRIMARY KEY,
      item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
      current_stock DECIMAL(10,2) NOT NULL,
      min_stock_threshold DECIMAL(10,2) NOT NULL,
      alert_created_at TIMESTAMPTZ DEFAULT NOW(),
      resolved BOOLEAN NOT NULL DEFAULT false,
      notes TEXT
    );
  `);
};