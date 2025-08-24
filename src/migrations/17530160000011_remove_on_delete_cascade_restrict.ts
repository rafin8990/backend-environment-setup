import pool from '../utils/dbClient';

export const name = '17530160000011_remove_on_delete_cascade_restrict';

export const run = async () => {
  // Set all values in affected foreign key columns to NULL
  await pool.query(`
    UPDATE menu_items SET parent_id = NULL WHERE parent_id IS NOT NULL;
    UPDATE items SET supplier_id = NULL WHERE supplier_id IS NOT NULL;
    UPDATE items SET type_id = NULL WHERE type_id IS NOT NULL;
    UPDATE items SET category_id = NULL WHERE category_id IS NOT NULL;
    UPDATE items SET location_id = NULL WHERE location_id IS NOT NULL;
    UPDATE recipes SET category_id = NULL WHERE category_id IS NOT NULL;
    UPDATE categories SET parent_category_id = NULL WHERE parent_category_id IS NOT NULL;
    UPDATE types SET parent_type_id = NULL WHERE parent_type_id IS NOT NULL;
  `);

  // Only update pe_items if it exists
  try {
    await pool.query(`UPDATE pe_items SET po_item_id = NULL WHERE po_item_id IS NOT NULL;`);
    await pool.query(`UPDATE pe_items SET item_id = NULL WHERE item_id IS NOT NULL;`);
  } catch (err) {
    if ((err as any).code !== '42P01') throw err; // Ignore 'relation does not exist' error
  }

  // Remove ON DELETE CASCADE and ON DELETE RESTRICT from all relevant foreign keys
  // You may need to adjust constraint names if they are not default
  await pool.query(`
    -- menu_items.parent_id
    ALTER TABLE IF EXISTS menu_items DROP CONSTRAINT IF EXISTS menu_items_parent_id_fkey;
    ALTER TABLE IF EXISTS menu_items ADD CONSTRAINT menu_items_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES menu_items(id);

    -- item_tags.item_id
    ALTER TABLE IF EXISTS item_tags DROP CONSTRAINT IF EXISTS item_tags_item_id_fkey;
    ALTER TABLE IF EXISTS item_tags ADD CONSTRAINT item_tags_item_id_fkey FOREIGN KEY (item_id) REFERENCES items(id);
    -- item_tags.tag_id
    ALTER TABLE IF EXISTS item_tags DROP CONSTRAINT IF EXISTS item_tags_tag_id_fkey;
    ALTER TABLE IF EXISTS item_tags ADD CONSTRAINT item_tags_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES tags(id);

    -- location_default_categories.location_id
    ALTER TABLE IF EXISTS location_default_categories DROP CONSTRAINT IF EXISTS location_default_categories_location_id_fkey;
    ALTER TABLE IF EXISTS location_default_categories ADD CONSTRAINT location_default_categories_location_id_fkey FOREIGN KEY (location_id) REFERENCES locations(id);
    -- location_default_categories.category_id
    ALTER TABLE IF EXISTS location_default_categories DROP CONSTRAINT IF EXISTS location_default_categories_category_id_fkey;
    ALTER TABLE IF EXISTS location_default_categories ADD CONSTRAINT location_default_categories_category_id_fkey FOREIGN KEY (category_id) REFERENCES categories(id);

    -- recipe_tags.recipe_id
    ALTER TABLE IF EXISTS recipe_tags DROP CONSTRAINT IF EXISTS recipe_tags_recipe_id_fkey;
    ALTER TABLE IF EXISTS recipe_tags ADD CONSTRAINT recipe_tags_recipe_id_fkey FOREIGN KEY (recipe_id) REFERENCES recipes(id);
    -- recipe_tags.tag_id
    ALTER TABLE IF EXISTS recipe_tags DROP CONSTRAINT IF EXISTS recipe_tags_tag_id_fkey;
    ALTER TABLE IF EXISTS recipe_tags ADD CONSTRAINT recipe_tags_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES tags(id);

    -- stocks.item_id
    ALTER TABLE IF EXISTS stocks DROP CONSTRAINT IF EXISTS stocks_item_id_fkey;
    ALTER TABLE IF EXISTS stocks ADD CONSTRAINT stocks_item_id_fkey FOREIGN KEY (item_id) REFERENCES items(id);

    -- po_items.po_id
    ALTER TABLE IF EXISTS po_items DROP CONSTRAINT IF EXISTS po_items_po_id_fkey;
    ALTER TABLE IF EXISTS po_items ADD CONSTRAINT po_items_po_id_fkey FOREIGN KEY (po_id) REFERENCES purchase_orders(id);
    -- po_items.item_id
    ALTER TABLE IF EXISTS po_items DROP CONSTRAINT IF EXISTS po_items_item_id_fkey;
    ALTER TABLE IF EXISTS po_items ADD CONSTRAINT po_items_item_id_fkey FOREIGN KEY (item_id) REFERENCES items(id);

    -- purchase_orders.supplier_id
    ALTER TABLE IF EXISTS purchase_orders DROP CONSTRAINT IF EXISTS purchase_orders_supplier_id_fkey;
    ALTER TABLE IF EXISTS purchase_orders ADD CONSTRAINT purchase_orders_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES suppliers(id);

    -- pe_items.po_item_id
    ALTER TABLE IF EXISTS pe_items DROP CONSTRAINT IF EXISTS pe_items_po_item_id_fkey;
    ALTER TABLE IF EXISTS pe_items ADD CONSTRAINT pe_items_po_item_id_fkey FOREIGN KEY (po_item_id) REFERENCES po_items(id);
    -- pe_items.item_id
    ALTER TABLE IF EXISTS pe_items DROP CONSTRAINT IF EXISTS pe_items_item_id_fkey;
    ALTER TABLE IF EXISTS pe_items ADD CONSTRAINT pe_items_item_id_fkey FOREIGN KEY (item_id) REFERENCES items(id);

    -- recipe_ingredients.recipe_id
    ALTER TABLE IF EXISTS recipe_ingredients DROP CONSTRAINT IF EXISTS recipe_ingredients_recipe_id_fkey;
    ALTER TABLE IF EXISTS recipe_ingredients ADD CONSTRAINT recipe_ingredients_recipe_id_fkey FOREIGN KEY (recipe_id) REFERENCES recipes(id);
    -- recipe_ingredients.ingredient_id
    ALTER TABLE IF EXISTS recipe_ingredients DROP CONSTRAINT IF EXISTS recipe_ingredients_ingredient_id_fkey;
    ALTER TABLE IF EXISTS recipe_ingredients ADD CONSTRAINT recipe_ingredients_ingredient_id_fkey FOREIGN KEY (ingredient_id) REFERENCES items(id);
  `);
};