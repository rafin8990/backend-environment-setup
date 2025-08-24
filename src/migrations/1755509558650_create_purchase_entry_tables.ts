import pool from '../utils/dbClient';

export const name = '1755509558650_create_purchase_entry_tables';

export const run = async () => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Create purchase_entries table
    await client.query(`
      CREATE TABLE IF NOT EXISTS purchase_entries (
        id SERIAL PRIMARY KEY,
        pe_number VARCHAR(50) UNIQUE NOT NULL,
        po_id INTEGER REFERENCES purchase_orders(id),
        grn_id INTEGER REFERENCES grns(id),
        amount_paid NUMERIC(12,2) NOT NULL,
        payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'completed')),
        payment_method VARCHAR(50),
        payment_reference VARCHAR(100),
        attachments TEXT[],
        created_by INTEGER REFERENCES users(id),
        updated_by INTEGER REFERENCES users(id),
        is_direct_pe BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Create indexes for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_purchase_entries_po_id ON purchase_entries(po_id);
      CREATE INDEX IF NOT EXISTS idx_purchase_entries_grn_id ON purchase_entries(grn_id);
      CREATE INDEX IF NOT EXISTS idx_purchase_entries_payment_status ON purchase_entries(payment_status);
      CREATE INDEX IF NOT EXISTS idx_purchase_entries_created_by ON purchase_entries(created_by);
    `);

    // Create trigger to update updated_at timestamp
    await client.query(`
      CREATE OR REPLACE FUNCTION update_pe_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    await client.query(`
      DROP TRIGGER IF EXISTS update_purchase_entries_updated_at ON purchase_entries;
      CREATE TRIGGER update_purchase_entries_updated_at
        BEFORE UPDATE ON purchase_entries
        FOR EACH ROW
        EXECUTE FUNCTION update_pe_updated_at_column();
    `);

    await client.query('COMMIT');
    console.log('✅ Purchase entry tables created successfully');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error creating purchase entry tables:', error);
    throw error;
  } finally {
    client.release();
  }
};
