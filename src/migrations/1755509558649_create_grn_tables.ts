import pool from '../utils/dbClient';

export const name = '1755509558649_create_grn_tables';

export const run = async () => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Create grns table
    await client.query(`
      CREATE TABLE IF NOT EXISTS grns (
        id SERIAL PRIMARY KEY,
        grn_number VARCHAR(50) UNIQUE NOT NULL,
        purchase_order_id INTEGER REFERENCES purchase_orders(id),
        received_at TIMESTAMPTZ NOT NULL,
        destination_location_id INTEGER NOT NULL REFERENCES locations(id),
        status VARCHAR(20) NOT NULL CHECK (status IN ('received', 'partial', 'rejected')),
        invoice_number VARCHAR(100),
        delivery_notes TEXT,
        attachments TEXT[],
        subtotal_amount NUMERIC(12,2) DEFAULT 0,
        discount_amount NUMERIC(12,2) DEFAULT 0,
        total_amount NUMERIC(12,2) DEFAULT 0,
        receiver_id INTEGER REFERENCES users(id),
        is_direct_grn BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Create grn_items table
    await client.query(`
      CREATE TABLE IF NOT EXISTS grn_items (
        id SERIAL PRIMARY KEY,
        grn_id INTEGER NOT NULL REFERENCES grns(id) ON DELETE CASCADE,
        item_id INTEGER NOT NULL REFERENCES items(id),
        quantity_expected NUMERIC(10,3) NOT NULL,
        quantity_received NUMERIC(10,3) NOT NULL,
        batch_number VARCHAR(100),
        expiry_date DATE,
        type VARCHAR(20) DEFAULT 'non_perishable' CHECK (type IN ('perishable', 'non_perishable')),
        reject_reason TEXT,
        notes TEXT,
        unit_cost NUMERIC(10,2) NOT NULL,
        total_cost NUMERIC(12,2) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Create indexes for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_grns_po_id ON grns(purchase_order_id);
      CREATE INDEX IF NOT EXISTS idx_grns_destination_location ON grns(destination_location_id);
      CREATE INDEX IF NOT EXISTS idx_grns_status ON grns(status);
      CREATE INDEX IF NOT EXISTS idx_grns_receiver_id ON grns(receiver_id);
      CREATE INDEX IF NOT EXISTS idx_grn_items_grn_id ON grn_items(grn_id);
      CREATE INDEX IF NOT EXISTS idx_grn_items_item_id ON grn_items(item_id);
      CREATE INDEX IF NOT EXISTS idx_grn_items_batch_number ON grn_items(batch_number);
    `);

    // Create trigger to update updated_at timestamp
    await client.query(`
      CREATE OR REPLACE FUNCTION update_grn_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    await client.query(`
      DROP TRIGGER IF EXISTS update_grns_updated_at ON grns;
      CREATE TRIGGER update_grns_updated_at
        BEFORE UPDATE ON grns
        FOR EACH ROW
        EXECUTE FUNCTION update_grn_updated_at_column();
    `);

    await client.query(`
      DROP TRIGGER IF EXISTS update_grn_items_updated_at ON grn_items;
      CREATE TRIGGER update_grn_items_updated_at
        BEFORE UPDATE ON grn_items
        FOR EACH ROW
        EXECUTE FUNCTION update_grn_updated_at_column();
    `);

    await client.query('COMMIT');
    console.log('✅ GRN tables created successfully');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error creating GRN tables:', error);
    throw error;
  } finally {
    client.release();
  }
};
