import pool from '../utils/dbClient';

export const name = '1755509558648_create_stock_movements_table';

export const run = async () => {
  // Create stock_movements table for tracking all stock movements
  await pool.query(`
    CREATE TABLE IF NOT EXISTS stock_movements (
      id SERIAL PRIMARY KEY,
      item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
      location_id INTEGER NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
      movement_type VARCHAR(50) NOT NULL CHECK (movement_type IN ('purchase', 'sale', 'transfer_in', 'transfer_out', 'adjustment', 'physical_count')),
      quantity NUMERIC(10,3) NOT NULL,
      reference_type VARCHAR(50) NOT NULL CHECK (reference_type IN ('purchase_entry', 'order', 'stock_transfer', 'adjustment', 'physical_count')),
      reference_id INTEGER NOT NULL,
      previous_quantity NUMERIC(10,3) NOT NULL,
      new_quantity NUMERIC(10,3) NOT NULL,
      unit_cost NUMERIC(10,2),
      notes TEXT,
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // Create indexes for better performance
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_stock_movements_item_id ON stock_movements(item_id);
    CREATE INDEX IF NOT EXISTS idx_stock_movements_location_id ON stock_movements(location_id);
    CREATE INDEX IF NOT EXISTS idx_stock_movements_movement_type ON stock_movements(movement_type);
    CREATE INDEX IF NOT EXISTS idx_stock_movements_reference ON stock_movements(reference_type, reference_id);
    CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON stock_movements(created_at);
  `);
};
