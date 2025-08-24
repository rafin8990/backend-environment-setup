import pool from '../utils/dbClient';

export const name = '1755665037896_create_purchase_entry_items_table';

export const run = async () => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Create purchase_entry_items table
    await client.query(`
      CREATE TABLE IF NOT EXISTS purchase_entry_items (
        id SERIAL PRIMARY KEY,
        pe_id INTEGER NOT NULL REFERENCES purchase_entries(id) ON DELETE CASCADE,
        item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
        quantity NUMERIC(10,3) NOT NULL,
        expected NUMERIC(10,3),
        price DECIMAL(10,2),
        notes TEXT,
        requisition_code VARCHAR(100),
        batch_number VARCHAR(100),
        expiry_date DATE,
        storage_location VARCHAR(255),
        quality_check VARCHAR(20) DEFAULT 'pending' CHECK (quality_check IN ('pending', 'passed', 'failed')),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Create indexes for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_purchase_entry_items_pe_id ON purchase_entry_items(pe_id);
      CREATE INDEX IF NOT EXISTS idx_purchase_entry_items_item_id ON purchase_entry_items(item_id);
      CREATE INDEX IF NOT EXISTS idx_purchase_entry_items_requisition_code ON purchase_entry_items(requisition_code);
    `);

    // Create trigger to update updated_at timestamp
    await client.query(`
      CREATE OR REPLACE FUNCTION update_purchase_entry_items_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await client.query(`
      CREATE TRIGGER trigger_update_purchase_entry_items_updated_at
        BEFORE UPDATE ON purchase_entry_items
        FOR EACH ROW
        EXECUTE FUNCTION update_purchase_entry_items_updated_at();
    `);

    await client.query('COMMIT');
    console.log('✅ Purchase entry items table created successfully');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error creating purchase entry items table:', error);
    throw error;
  } finally {
    client.release();
  }
};