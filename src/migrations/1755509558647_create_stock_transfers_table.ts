import pool from '../utils/dbClient';

export const name = '1755509558647_create_stock_transfers_table';

export const run = async () => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Create stock_transfers table
    await client.query(`
      CREATE TABLE IF NOT EXISTS stock_transfers (
        id SERIAL PRIMARY KEY,
        transfer_number VARCHAR(50) UNIQUE NOT NULL,
        source_location_id INTEGER NOT NULL REFERENCES locations(id),
        destination_location_id INTEGER NOT NULL REFERENCES locations(id),
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'dispatched', 'in_transit', 'received', 'cancelled')),
        transfer_type VARCHAR(50) DEFAULT 'manual' CHECK (transfer_type IN ('manual', 'requisition_fulfillment', 'production_output', 'replenishment', 'po_distribution')),
        purchase_order_id INTEGER REFERENCES purchase_orders(id),
        requisition_id INTEGER REFERENCES requisitions(id),
        notes TEXT,
        created_by INTEGER REFERENCES users(id),
        approved_by INTEGER REFERENCES users(id),
        updated_by INTEGER REFERENCES users(id),
        dispatched_at TIMESTAMPTZ,
        received_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Create stock_transfer_items table
    await client.query(`
      CREATE TABLE IF NOT EXISTS stock_transfer_items (
        id SERIAL PRIMARY KEY,
        stock_transfer_id INTEGER NOT NULL REFERENCES stock_transfers(id) ON DELETE CASCADE,
        item_id INTEGER NOT NULL REFERENCES items(id),
        quantity_requested NUMERIC(10,3) NOT NULL,
        quantity_dispatched NUMERIC(10,3) DEFAULT 0,
        quantity_received NUMERIC(10,3) DEFAULT 0,
        unit VARCHAR(50) NOT NULL,
        batch_number VARCHAR(100),
        expiry_date DATE,
        cost_per_unit NUMERIC(10,2),
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Create indexes for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_stock_transfers_source_location ON stock_transfers(source_location_id);
      CREATE INDEX IF NOT EXISTS idx_stock_transfers_dest_location ON stock_transfers(destination_location_id);
      CREATE INDEX IF NOT EXISTS idx_stock_transfers_status ON stock_transfers(status);
      CREATE INDEX IF NOT EXISTS idx_stock_transfers_created_by ON stock_transfers(created_by);
      CREATE INDEX IF NOT EXISTS idx_stock_transfers_purchase_order_id ON stock_transfers(purchase_order_id);
      CREATE INDEX IF NOT EXISTS idx_stock_transfers_requisition_id ON stock_transfers(requisition_id);
      CREATE INDEX IF NOT EXISTS idx_stock_transfer_items_transfer_id ON stock_transfer_items(stock_transfer_id);
      CREATE INDEX IF NOT EXISTS idx_stock_transfer_items_item_id ON stock_transfer_items(item_id);
    `);

    // Create trigger to update updated_at timestamp for stock_transfers
    await client.query(`
      CREATE OR REPLACE FUNCTION update_stock_transfers_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    await client.query(`
      DROP TRIGGER IF EXISTS update_stock_transfers_updated_at ON stock_transfers;
      CREATE TRIGGER update_stock_transfers_updated_at
        BEFORE UPDATE ON stock_transfers
        FOR EACH ROW
        EXECUTE FUNCTION update_stock_transfers_updated_at();
    `);

    // Create trigger to update updated_at timestamp for stock_transfer_items
    await client.query(`
      CREATE OR REPLACE FUNCTION update_stock_transfer_items_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    await client.query(`
      DROP TRIGGER IF EXISTS update_stock_transfer_items_updated_at ON stock_transfer_items;
      CREATE TRIGGER update_stock_transfer_items_updated_at
        BEFORE UPDATE ON stock_transfer_items
        FOR EACH ROW
        EXECUTE FUNCTION update_stock_transfer_items_updated_at();
    `);

    await client.query('COMMIT');
    console.log('✅ Stock transfer tables created successfully');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error creating stock transfer tables:', error);
    throw error;
  } finally {
    client.release();
  }
};
