import pool from '../utils/dbClient';

const fixOrdersTables = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Drop existing tables if they exist
    await client.query(`DROP TABLE IF EXISTS order_items CASCADE;`);
    await client.query(`DROP TABLE IF EXISTS orders CASCADE;`);

    // Create orders table
    await client.query(`
      CREATE TABLE orders (
        id SERIAL PRIMARY KEY,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        approver_id INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create order_items table with DECIMAL quantity
    await client.query(`
      CREATE TABLE order_items (
        id SERIAL PRIMARY KEY,
        order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
        quantity DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create indexes for better performance
    await client.query(`
      CREATE INDEX idx_orders_status ON orders(status);
      CREATE INDEX idx_orders_approver_id ON orders(approver_id);
      CREATE INDEX idx_order_items_order_id ON order_items(order_id);
      CREATE INDEX idx_order_items_item_id ON order_items(item_id);
    `);

    await client.query('COMMIT');
    console.log('✅ Orders and order_items tables recreated successfully with DECIMAL quantity');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error recreating orders tables:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

fixOrdersTables();
