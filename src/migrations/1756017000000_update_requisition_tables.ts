import pool from '../utils/dbClient';

export const name = '1756017000000_update_requisition_tables';

export const run = async () => {
  // Add missing columns to requisitions table
  await pool.query(`
    ALTER TABLE requisitions 
    ADD COLUMN IF NOT EXISTS requisition_number VARCHAR(100) UNIQUE,
    ADD COLUMN IF NOT EXISTS requisition_type VARCHAR(50) DEFAULT 'stock_transfer',
    ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'medium',
    ADD COLUMN IF NOT EXISTS expected_delivery_date DATE,
    ADD COLUMN IF NOT EXISTS notes TEXT;
  `);

  // Add missing columns to requisition_items table
  await pool.query(`
    ALTER TABLE requisition_items 
    ADD COLUMN IF NOT EXISTS estimated_cost DECIMAL(10,2),
    ADD COLUMN IF NOT EXISTS notes TEXT;
  `);

  // Update quantity fields to be DECIMAL for more precision
  await pool.query(`
    ALTER TABLE requisition_items 
    ALTER COLUMN quantity_expected TYPE DECIMAL(10,2),
    ALTER COLUMN quantity_received TYPE DECIMAL(10,2);
  `);

  // Create indexes for new fields
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_requisitions_requisition_number ON requisitions(requisition_number);
    CREATE INDEX IF NOT EXISTS idx_requisitions_requisition_type ON requisitions(requisition_type);
    CREATE INDEX IF NOT EXISTS idx_requisitions_priority ON requisitions(priority);
  `);
};
