import pool from '../utils/dbClient';

export const name = '1753013120000_convert_substitute_ids_to_integer';

export const run = async () => {
  // Check the current data type of substitute_ids column
  const columnInfo = await pool.query(`
    SELECT data_type 
    FROM information_schema.columns 
    WHERE table_name = 'recipe_ingredients' 
    AND column_name = 'substitute_ids';
  `);

  if (columnInfo.rows.length === 0) {
    console.log('❌ substitute_ids column does not exist');
    return;
  }

  const currentDataType = columnInfo.rows[0].data_type;
  console.log(`Current data type of substitute_ids: ${currentDataType}`);

  // If it's already integer, no need to convert
  if (currentDataType === 'integer') {
    console.log('✅ substitute_ids is already INTEGER type, skipping conversion');
    return;
  }

  // Check if temporary column already exists
  const tempColumnExists = await pool.query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'recipe_ingredients' 
    AND column_name = 'substitute_ids_temp';
  `);

  // Only add the temporary column if it doesn't exist
  if (tempColumnExists.rows.length === 0) {
    await pool.query(`
      ALTER TABLE recipe_ingredients
      ADD COLUMN substitute_ids_temp INTEGER;
    `);
  }

  // Copy data based on the current data type
  if (currentDataType === 'ARRAY') {
    // Handle array type
    await pool.query(`
      UPDATE recipe_ingredients
      SET substitute_ids_temp = CASE
        WHEN substitute_ids IS NOT NULL AND array_length(substitute_ids, 1) > 0 THEN substitute_ids[1]
        ELSE NULL
      END;
    `);
  } else {
    // Handle other types (like text, json, etc.) - try to convert directly
    await pool.query(`
      UPDATE recipe_ingredients
      SET substitute_ids_temp = CASE
        WHEN substitute_ids IS NOT NULL AND substitute_ids != '' THEN 
          CASE 
            WHEN substitute_ids ~ '^[0-9]+$' THEN substitute_ids::integer
            ELSE NULL
          END
        ELSE NULL
      END;
    `);
  }

  // Drop the original column
  await pool.query(`
    ALTER TABLE recipe_ingredients
    DROP COLUMN substitute_ids;
  `);

  // Rename the temporary column to the original name
  await pool.query(`
    ALTER TABLE recipe_ingredients
    RENAME COLUMN substitute_ids_temp TO substitute_ids;
  `);

  console.log('✅ Successfully converted substitute_ids to INTEGER type');
};