import pool from '../utils/dbClient';

export const name = '1752755988641_create_items_table';

export const run = async () => {
  await pool.query(`
  CREATE TABLE IF NOT EXISTS items (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  supplier_id INT REFERENCES suppliers(id),
  type_id INT REFERENCES types(id),
  category_id INT REFERENCES categories(id),
  location_id INT REFERENCES locations(id),
  description TEXT,
  unit VARCHAR(50),
  image_urls TEXT[],
  stock_quantity INT DEFAULT 0,
  min_stock INT NOT NULL,
  max_stock INT NOT NULL,
  expiry_date DATE,
  cost_per_unit NUMERIC(10, 2),
  last_restocked TIMESTAMPTZ,
  shelf_life INT,
  storage_conditions TEXT,
  temperature_range VARCHAR(100),
  humidity_range VARCHAR(100),
  status VARCHAR(20) CHECK (status IN ('active', 'inactive', 'expired', 'archived')) NOT NULL,
  batch_tracking_enabled BOOLEAN DEFAULT FALSE,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
  `);
  await pool.query(`
  CREATE TABLE IF NOT EXISTS item_tags (
  item_id INT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  tag_id INT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (item_id, tag_id)
);
  `);
};
