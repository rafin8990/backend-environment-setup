import pool from '../utils/dbClient';

export const name = '1752657275857_change_type_table_name';

export const run = async () => {
  // Write your SQL query here
  await pool.query(`
   ALTER TABLE type_table RENAME TO types;
  `);
};
