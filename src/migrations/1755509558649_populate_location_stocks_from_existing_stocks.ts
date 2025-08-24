import pool from '../utils/dbClient';

export const name = '1755509558649_populate_location_stocks_from_existing_stocks';

export const run = async () => {
  // Populate location_stocks table with data from existing stocks and items
  await pool.query(`
    INSERT INTO location_stocks (
      location_id, item_id, available_quantity, reserved_quantity, 
      allocated_quantity, min_stock, max_stock
    )
    SELECT 
      s.location_id,
      s.item_id,
      s.physical_stock_count as available_quantity,
      0 as reserved_quantity,
      0 as allocated_quantity,
      COALESCE(i.min_stock, 0) as min_stock,
      COALESCE(i.max_stock, 1000) as max_stock
    FROM stocks s
    JOIN items i ON s.item_id = i.id
    ON CONFLICT (location_id, item_id) DO NOTHING;
  `);

  // Create location_stocks records for items that don't have stock records yet
  await pool.query(`
    INSERT INTO location_stocks (
      location_id, item_id, available_quantity, reserved_quantity, 
      allocated_quantity, min_stock, max_stock
    )
    SELECT 
      1 as location_id, -- Default to Central Warehouse (ID 1)
      i.id as item_id,
      COALESCE(i.stock_quantity, 0) as available_quantity,
      0 as reserved_quantity,
      0 as allocated_quantity,
      COALESCE(i.min_stock, 0) as min_stock,
      COALESCE(i.max_stock, 1000) as max_stock
    FROM items i
    WHERE NOT EXISTS (
      SELECT 1 FROM location_stocks ls 
      WHERE ls.item_id = i.id AND ls.location_id = 1
    )
    ON CONFLICT (location_id, item_id) DO NOTHING;
  `);

  console.log('✅ Location stocks populated from existing data');
};
