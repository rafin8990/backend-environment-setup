import httpStatus from 'http-status';
import ApiError from '../../../errors/ApiError';
import pool from '../../../utils/dbClient';
import { IStorageLocation } from './location.interface';
import { IPaginationOptions } from '../../../interfaces/pagination';
import { ICategory } from '../categories/categories.interface';
import { IGenericResponse } from '../../../interfaces/common';
import { paginationHelpers } from '../../../helpers/paginationHelper';

const createLocation = async (
  data: IStorageLocation
): Promise<IStorageLocation> => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const insertLocationQuery = `
      INSERT INTO locations (name, description, type, temperature_controlled)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    const values = [
      data.name,
      data.description ?? null,
      data.type,
      data.temperature_controlled,
    ];

    const locationResult = await client.query(insertLocationQuery, values);
    const location = locationResult.rows[0];

    if (Array.isArray(data.default_for_category) && data.default_for_category.length > 0) {
      const inserts = data.default_for_category.map(categoryId =>
        client.query(
          `INSERT INTO location_default_categories (location_id, category_id) VALUES ($1, $2);`,
          [location.id, categoryId]
        )
      );
      await Promise.all(inserts);
    }

    await client.query('COMMIT');
    return location;
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating location:', err);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to create location');
  } finally {
    client.release();
  }
};

type IStorageLocationWithCategories = Omit<IStorageLocation, 'default_for_category'> & { default_for_category: ICategory[] };

const getAllLocations = async (
  filters: any,
  paginationOptions: IPaginationOptions
): Promise<IGenericResponse<IStorageLocationWithCategories[]>> => {
  const { searchTerm, ...filterFields } = filters;
  const { page, limit, skip, sortBy, sortOrder } =
    paginationHelpers.calculatePagination(paginationOptions);

  const conditions: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  // Search fields
  if (searchTerm) {
    const searchFields = ['name', 'description', 'type'];
    const searchCondition = searchFields
      .map(field => `${field} ILIKE $${paramIndex++}`)
      .join(' OR ');
    values.push(...searchFields.map(() => `%${searchTerm}%`));
    conditions.push(`(${searchCondition})`);
  }

  // Exact match filters
  for (const [field, value] of Object.entries(filterFields)) {
    if (value !== undefined && value !== null) {
      conditions.push(`${field} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const query = `
    SELECT * FROM locations
    ${whereClause}
    ORDER BY ${sortBy} ${sortOrder}
    LIMIT $${paramIndex++} OFFSET $${paramIndex};
  `;
  values.push(limit, skip);

  const locationResult = await pool.query(query, values);
  const locations: any[] = locationResult.rows;
  const locationIds = locations.map(l => l.id);

  // Fetch categories for locations
  let categoryMap: Record<number, ICategory[]> = {};

  if (locationIds.length > 0) {
    const joinQuery = `
      SELECT ldc.location_id, c.*
      FROM location_default_categories ldc
      JOIN categories c ON ldc.category_id = c.id
      WHERE ldc.location_id = ANY($1::int[]);
    `;
    const categoryResult = await pool.query(joinQuery, [locationIds]);

    categoryMap = categoryResult.rows.reduce((acc, row) => {
      if (!acc[row.location_id]) acc[row.location_id] = [];
      const { location_id, ...category } = row;
      acc[location_id].push(category);
      return acc;
    }, {} as Record<number, ICategory[]>);
  }

  const enrichedLocations = locations.map(location => {
    return {
      ...location,
      default_for_category: categoryMap[Number(location.id)] || [],
    };
  });

  const countQuery = `SELECT COUNT(*) FROM locations ${whereClause};`;
  const countResult = await pool.query(countQuery, values.slice(0, paramIndex - 2));
  const total = parseInt(countResult.rows[0].count, 10);

  return {
    meta: { page, limit, total },
    data: enrichedLocations,
  };
};

const getSingleLocation = async (
  id: number
): Promise<Omit<IStorageLocation, 'default_for_category'> & { default_for_category: ICategory[] }> => {
  const locationResult = await pool.query(
    `SELECT * FROM locations WHERE id = $1`,
    [id]
  );

  if (locationResult.rows.length === 0) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Location not found');
  }

  const location: IStorageLocation = locationResult.rows[0];

  const categoryResult = await pool.query(
    `
    SELECT c.*
    FROM location_default_categories ldc
    JOIN categories c ON ldc.category_id = c.id
    WHERE ldc.location_id = $1;
  `,
    [id]
  );

  const categories: ICategory[] = categoryResult.rows;

  return {
    ...location,
    default_for_category: categories,
  };
};

const updateLocation = async (
  id: number,
  data: IStorageLocation
): Promise<Awaited<ReturnType<typeof getSingleLocation>>> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const fields = Object.keys(data).filter(f => f !== 'default_for_category');
    const setClause = fields
      .map((field, index) => `${field} = $${index + 1}`)
      .join(', ');

    const values = fields.map(f => (data as any)[f]);
    values.push(id); // for WHERE clause

    if (setClause) {
      const updateQuery = `
        UPDATE locations SET ${setClause}, updated_at = NOW()
        WHERE id = $${fields.length + 1};
      `;
      await client.query(updateQuery, values);
    }

    if (data.default_for_category) {
      await client.query(
        `DELETE FROM location_default_categories WHERE location_id = $1`,
        [id]
      );

      const inserts = (data.default_for_category as number[]).map(categoryId =>
        client.query(
          `INSERT INTO location_default_categories (location_id, category_id) VALUES ($1, $2);`,
          [id, categoryId]
        )
      );
      await Promise.all(inserts);
    }

    await client.query('COMMIT');

    return await getSingleLocation(id);
  } catch (error) {
    await client.query('ROLLBACK');
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to update location');
  } finally {
    client.release();
  }
};

const deleteLocation = async (id: number): Promise<void> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existing = await client.query(
      'SELECT * FROM locations WHERE id = $1',
      [id]
    );
    if (existing.rowCount === 0) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Location not found');
    }

    await client.query(
      'DELETE FROM location_default_categories WHERE location_id = $1',
      [id]
    );

    await client.query('DELETE FROM locations WHERE id = $1', [id]);

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to delete location');
  } finally {
    client.release();
  }
};

export const LocationService = {
  createLocation,
  getAllLocations,
  getSingleLocation,
  updateLocation,
  deleteLocation,
};
