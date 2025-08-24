import pool from '../utils/dbClient';

export const name = '1755509558648_create_purchase_order_tables';

export const run = async () => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Drop existing tables if they exist to avoid conflicts
    await client.query(`DROP TABLE IF EXISTS po_delivery_locations CASCADE;`);
    await client.query(`DROP TABLE IF EXISTS purchase_order_items CASCADE;`);
    await client.query(`DROP TABLE IF EXISTS purchase_orders CASCADE;`);

    // Create purchase_orders table
    await client.query(`
      CREATE TABLE IF NOT EXISTS purchase_orders (
        id SERIAL PRIMARY KEY,
        po_number VARCHAR(50) UNIQUE NOT NULL,
        supplier_id INTEGER NOT NULL REFERENCES suppliers(id),
        order_type VARCHAR(20) NOT NULL CHECK (order_type IN ('direct', 'consolidated', 'requisition_based')),
        delivery_type VARCHAR(20) NOT NULL CHECK (delivery_type IN ('single_location', 'multiple_locations')),
        expected_delivery_date DATE NOT NULL,
        central_delivery_location_id INTEGER REFERENCES locations(id),
        notes TEXT,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'ordered', 'partially_received', 'completed', 'cancelled')),
        total_amount NUMERIC(12,2) DEFAULT 0,
        created_by INTEGER,
        approved_by INTEGER,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Create purchase_order_items table
    await client.query(`
      CREATE TABLE IF NOT EXISTS purchase_order_items (
        id SERIAL PRIMARY KEY,
        purchase_order_id INTEGER NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
        item_id INTEGER NOT NULL REFERENCES items(id),
        quantity NUMERIC(10,3) NOT NULL,
        unit VARCHAR(50) NOT NULL,
        unit_price NUMERIC(10,2) NOT NULL,
        total_price NUMERIC(12,2) NOT NULL,
        delivery_location_id INTEGER NOT NULL REFERENCES locations(id),
        requisition_item_ids INTEGER[],
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Create po_delivery_locations table
    await client.query(`
      CREATE TABLE IF NOT EXISTS po_delivery_locations (
        id SERIAL PRIMARY KEY,
        purchase_order_id INTEGER NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
        location_id INTEGER NOT NULL REFERENCES locations(id),
        delivery_address TEXT,
        expected_delivery_date DATE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Create indexes for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier_id ON purchase_orders(supplier_id);
      CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);
      CREATE INDEX IF NOT EXISTS idx_purchase_order_items_po_id ON purchase_order_items(purchase_order_id);
      CREATE INDEX IF NOT EXISTS idx_purchase_order_items_item_id ON purchase_order_items(item_id);
      CREATE INDEX IF NOT EXISTS idx_purchase_order_items_delivery_location ON purchase_order_items(delivery_location_id);
      CREATE INDEX IF NOT EXISTS idx_po_delivery_locations_po_id ON po_delivery_locations(purchase_order_id);
    `);

    // Create trigger to update updated_at timestamp
    await client.query(`
      CREATE OR REPLACE FUNCTION update_po_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    await client.query(`
      DROP TRIGGER IF EXISTS update_purchase_orders_updated_at ON purchase_orders;
      CREATE TRIGGER update_purchase_orders_updated_at
        BEFORE UPDATE ON purchase_orders
        FOR EACH ROW
        EXECUTE FUNCTION update_po_updated_at_column();
    `);

    await client.query(`
      DROP TRIGGER IF EXISTS update_purchase_order_items_updated_at ON purchase_order_items;
      CREATE TRIGGER update_purchase_order_items_updated_at
        BEFORE UPDATE ON purchase_order_items
        FOR EACH ROW
        EXECUTE FUNCTION update_po_updated_at_column();
    `);

    await client.query('COMMIT');
    console.log('✅ Purchase order tables created successfully');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error creating purchase order tables:', error);
    throw error;
  } finally {
    client.release();
  }
};
