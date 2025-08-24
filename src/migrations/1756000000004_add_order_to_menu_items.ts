import pool from '../utils/dbClient';

export const name = '1756000000004_add_order_to_menu_items';

export const run = async () => {
  // Add order column to menu_items table
  await pool.query(`
    ALTER TABLE menu_items 
    ADD COLUMN IF NOT EXISTS "order" INTEGER DEFAULT 0;
  `);

  // Create index on order for better performance
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_menu_items_order 
    ON menu_items ("order");
  `);

  // Create index on parent_id and order for hierarchical ordering
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_menu_items_parent_order 
    ON menu_items (parent_id, "order");
  `);

  // Update existing records to have sequential order values
  await pool.query(`
    UPDATE menu_items 
    SET "order" = subquery.row_num
    FROM (
      SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as row_num
      FROM menu_items
    ) as subquery
    WHERE menu_items.id = subquery.id;
  `);
};
