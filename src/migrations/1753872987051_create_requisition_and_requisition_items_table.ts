import pool from '../utils/dbClient';

export const name = '1753872987051_create_requisition_and_requisition_items_table';

export const run = async () => {
  // Create requisition table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS requisitions (
      id SERIAL PRIMARY KEY,
      source_location_id INTEGER NOT NULL REFERENCES locations(id),
      status VARCHAR(50) NOT NULL DEFAULT 'pending',
      requisition_date DATE NOT NULL DEFAULT CURRENT_DATE,
      delivery_address TEXT NOT NULL,
      created_by INTEGER NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create requisition_items table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS requisition_items (
      id SERIAL PRIMARY KEY,
      requisition_id INTEGER NOT NULL REFERENCES requisitions(id) ON DELETE CASCADE,
      item_id INTEGER NOT NULL REFERENCES items(id),
      quantity_expected INTEGER NULL,
      quantity_received INTEGER NULL DEFAULT 0,
      unit VARCHAR(50) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create indexes for better performance
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_requisitions_source_location_id ON requisitions(source_location_id);
    CREATE INDEX IF NOT EXISTS idx_requisitions_status ON requisitions(status);
    CREATE INDEX IF NOT EXISTS idx_requisitions_created_by ON requisitions(created_by);
    CREATE INDEX IF NOT EXISTS idx_requisition_items_requisition_id ON requisition_items(requisition_id);
    CREATE INDEX IF NOT EXISTS idx_requisition_items_item_id ON requisition_items(item_id);
  `);

  // Create trigger to update updated_at timestamp
  await pool.query(`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    $$ language 'plpgsql';
  `);

  await pool.query(`
    DROP TRIGGER IF EXISTS update_requisitions_updated_at ON requisitions;
    CREATE TRIGGER update_requisitions_updated_at
      BEFORE UPDATE ON requisitions
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  `);

  await pool.query(`
    DROP TRIGGER IF EXISTS update_requisition_items_updated_at ON requisition_items;
    CREATE TRIGGER update_requisition_items_updated_at
      BEFORE UPDATE ON requisition_items
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  `);
};