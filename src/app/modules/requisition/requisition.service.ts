import httpStatus from 'http-status';
import ApiError from '../../../errors/ApiError';
import { paginationHelpers } from '../../../helpers/paginationHelper';
import { IGenericResponse } from '../../../interfaces/common';
import { IPaginationOptions } from '../../../interfaces/pagination';
import pool from '../../../utils/dbClient';
import { IRequisition, IRequisitionCreateRequest, IRequisitionFilters, IRequisitionItemReceived, IRequisitionUpdateRequest } from './requisition.interface';

const createRequisition = async (data: IRequisitionCreateRequest): Promise<IRequisition> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Insert requisition
    const insertRequisitionQuery = `
      INSERT INTO requisitions (
        source_location_id, status, requisition_date, delivery_location_id, created_by,
        requisition_number, requisition_type, priority, expected_delivery_date, notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *;
    `;

    const requisitionValues = [
      data.source_location_id,
      data.status || 'pending',
      data.expected_delivery_date ? new Date(data.expected_delivery_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      data.delivery_location_id,
      data.created_by ?? null,
      data.requisition_number,
      data.requisition_type || 'stock_transfer',
      data.priority || 'medium',
      data.expected_delivery_date,
      data.notes || null,
    ];

    const requisitionResult = await client.query(insertRequisitionQuery, requisitionValues);
    const requisition = requisitionResult.rows[0];

    // Insert requisition items
    if (data.items && data.items.length > 0) {
      const itemInsertions = data.items.map(item =>
        client.query(
          `INSERT INTO requisition_items (
            requisition_id, item_id, quantity_expected, unit, estimated_cost, notes
          ) VALUES ($1, $2, $3, $4, $5, $6)`,
          [requisition.id, item.item_id, item.quantity_requested, item.unit, item.estimated_cost || null, item.notes || null]
        )
      );
      await Promise.all(itemInsertions);
    }

    await client.query('COMMIT');

    // Fetch the complete requisition with items
    return await getSingleRequisition(requisition.id);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[CREATE REQUISITION ERROR]', error);
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to create requisition'
    );
  } finally {
    client.release();
  }
};

const getAllRequisitions = async (
  filters: IRequisitionFilters,
  paginationOptions: IPaginationOptions
): Promise<IGenericResponse<Array<IRequisition>>> => {
  const { searchTerm, status, source_location_id, created_by, created_at, start_date, end_date, ...filterFields } = filters;
  const { page, limit, skip, sortBy = 'created_at', sortOrder = 'desc' } =
    paginationHelpers.calculatePagination(paginationOptions);

  const conditions: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (searchTerm) {
    conditions.push(`(source_loc.name ILIKE $${paramIndex++} OR delivery_loc.name ILIKE $${paramIndex++})`);
    values.push(`%${searchTerm}%`, `%${searchTerm}%`);
  }

  if (status) {
    conditions.push(`r.status = $${paramIndex++}`);
    values.push(status);
  }

  if (source_location_id) {
    conditions.push(`r.source_location_id = $${paramIndex++}`);
    values.push(source_location_id);
  }

  if (created_by) {
    conditions.push(`r.created_by = $${paramIndex++}`);
    values.push(created_by);
  }

  if (created_at) {
    conditions.push(`r.created_at = $${paramIndex++}`);
    values.push(created_at);
  }

  // Date range filtering
  if (start_date) {
    conditions.push(`DATE(r.created_at) >= $${paramIndex++}`);
    values.push(start_date);
  }

  if (end_date) {
    conditions.push(`DATE(r.created_at) <= $${paramIndex++}`);
    values.push(end_date);
  }

  for (const [field, value] of Object.entries(filterFields)) {
    if (value !== undefined && value !== null) {
      conditions.push(`r.${field} = $${paramIndex++}`);
      values.push(value);
    }
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const requisitionQuery = `
    SELECT 
      r.*,
      row_to_json(source_loc) AS source_location,
      row_to_json(delivery_loc) AS delivery_location
    FROM requisitions r
    LEFT JOIN locations source_loc ON r.source_location_id = source_loc.id
    LEFT JOIN locations delivery_loc ON r.delivery_location_id = delivery_loc.id
    ${whereClause}
    ORDER BY r.${sortBy} ${sortOrder}
    LIMIT $${paramIndex++} OFFSET $${paramIndex};
  `;
  values.push(limit, skip);

  const requisitionsResult = await pool.query(requisitionQuery, values);
  const requisitions: any[] = requisitionsResult.rows;

  // Fetch items for each requisition
  const requisitionIds = requisitions.map(r => r.id);
  const itemsMap: Record<number, any[]> = {};

  if (requisitionIds.length > 0) {
    const itemsQuery = `
      SELECT 
        ri.*,
        row_to_json(item) AS item_details
      FROM requisition_items ri
      LEFT JOIN items item ON ri.item_id = item.id
      WHERE ri.requisition_id = ANY($1::int[])
      ORDER BY ri.created_at;
    `;
    const itemsResult = await pool.query(itemsQuery, [requisitionIds]);
    
    itemsResult.rows.forEach(row => {
      const { requisition_id, ...itemData } = row;
      if (!itemsMap[requisition_id]) itemsMap[requisition_id] = [];
      itemsMap[requisition_id].push(itemData);
    });
  }

  const enrichedRequisitions = requisitions.map(requisition => ({
    ...requisition,
    items: itemsMap[requisition.id] || [],
  }));

  // Count total records
  let countQuery = `SELECT COUNT(*) FROM requisitions r`;
  let countValues = [];
  
  if (conditions.length > 0) {
    countQuery += ` ${whereClause}`;
    countValues = values.slice(0, paramIndex - 2);
  }
  
  const countResult = await pool.query(countQuery, countValues);
  const total = parseInt(countResult.rows[0].count, 10);

  return {
    meta: { page, limit, total },
    data: enrichedRequisitions,
  };
};


const getPendingRequisitionsAnalysis = async () => {
  // Get all pending requisitions with their items and location details
  const pendingRequisitionsQuery = `
    SELECT 
      r.id as requisition_id,
      r.source_location_id,
      r.delivery_location_id,
      r.requisition_date,
      r.created_at,
      loc.name as location_name,
      delivery_loc.name as delivery_location_name,
      ri.item_id,
      ri.quantity_expected,
      ri.unit,
      item.name as item_name,
      item.description as item_description
    FROM requisitions r
    LEFT JOIN locations loc ON r.source_location_id = loc.id
    LEFT JOIN locations delivery_loc ON r.delivery_location_id = delivery_loc.id
    LEFT JOIN requisition_items ri ON r.id = ri.requisition_id
    LEFT JOIN items item ON ri.item_id = item.id
    WHERE r.status = 'pending'
    ORDER BY r.created_at DESC, ri.item_id;
  `;

  const pendingResult = await pool.query(pendingRequisitionsQuery);
  const pendingData = pendingResult.rows;

  // Group by item_id to get total quantities across all branches
  const itemTotals: Record<number, any> = {};
  const branchBreakdown: Record<number, any[]> = {};

  pendingData.forEach(row => {
    const { item_id, quantity_expected, unit, item_name, item_description, 
            requisition_id, source_location_id, location_name, delivery_location_id, 
            delivery_location_name, requisition_date, created_at } = row;

    // Initialize item totals
    if (!itemTotals[item_id]) {
      itemTotals[item_id] = {
        item_id,
        item_name,
        item_description,
        total_quantity_requested: 0,
        unit,
        total_requisitions: 0,
        branches_requesting: new Set()
      };
    }

    // Add to totals
    itemTotals[item_id].total_quantity_requested += quantity_expected || 0;
    itemTotals[item_id].total_requisitions += 1;
    itemTotals[item_id].branches_requesting.add(source_location_id);

    // Initialize branch breakdown
    if (!branchBreakdown[item_id]) {
      branchBreakdown[item_id] = [];
    }

          // Add to branch breakdown
      const existingBranch = branchBreakdown[item_id].find(b => b.location_id === source_location_id);
      if (existingBranch) {
        existingBranch.quantity_requested += quantity_expected || 0;
        existingBranch.requisitions.push({
          requisition_id,
          quantity_expected,
          delivery_location_id,
          delivery_location_name,
          requisition_date,
          created_at
        });
      } else {
        branchBreakdown[item_id].push({
          location_id: source_location_id,
          location_name,
          quantity_requested: quantity_expected || 0,
          requisitions: [{
            requisition_id,
            quantity_expected,
            delivery_location_id,
            delivery_location_name,
            requisition_date,
            created_at
          }]
        });
      }
  });

  // Convert sets to arrays and format the response
  const formattedItemTotals = Object.values(itemTotals).map(item => ({
    ...item,
    branches_requesting: Array.from(item.branches_requesting),
    branch_count: item.branches_requesting.size,
    branch_breakdown: branchBreakdown[item.item_id] || []
  }));

  return {
    total_pending_requisitions: pendingData.length > 0 ? new Set(pendingData.map(r => r.requisition_id)).size : 0,
    total_unique_items: Object.keys(itemTotals).length,
    items_analysis: formattedItemTotals
  };
};

const getSingleRequisition = async (id: number): Promise<IRequisition> => {
  const requisitionResult = await pool.query(
    `
    SELECT 
      r.*,
      row_to_json(source_loc) AS source_location,
      row_to_json(delivery_loc) AS delivery_location
    FROM requisitions r
    LEFT JOIN locations source_loc ON r.source_location_id = source_loc.id
    LEFT JOIN locations delivery_loc ON r.delivery_location_id = delivery_loc.id
    WHERE r.id = $1;
    `,
    [id]
  );

  if (!requisitionResult.rows.length) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Requisition not found');
  }

  const requisition = requisitionResult.rows[0];

  // Fetch requisition items
  const itemsResult = await pool.query(
    `
    SELECT 
      ri.*,
      row_to_json(item) AS item_details
    FROM requisition_items ri
    LEFT JOIN items item ON ri.item_id = item.id
    WHERE ri.requisition_id = $1
    ORDER BY ri.created_at;
    `,
    [id]
  );

  return {
    ...requisition,
    items: itemsResult.rows,
  };
};

const updateRequisition = async (
  id: number,
  data: IRequisitionUpdateRequest
): Promise<IRequisition> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check if requisition exists
    const existingResult = await client.query(
      'SELECT * FROM requisitions WHERE id = $1',
      [id]
    );

    if (!existingResult.rows.length) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Requisition not found');
    }

    // Update requisition fields
    const requisitionFields = Object.keys(data).filter(k => k !== 'items');
    let updatedRequisition: any = existingResult.rows[0];

    if (requisitionFields.length > 0) {
      const setClause = requisitionFields
        .map((field, i) => `${field} = $${i + 1}`)
        .join(', ');
      const values = requisitionFields.map(field => (data as any)[field]);
      values.push(id);

      const updateQuery = `
        UPDATE requisitions
        SET ${setClause}, updated_at = NOW()
        WHERE id = $${requisitionFields.length + 1}
        RETURNING *;
      `;

      const updateResult = await client.query(updateQuery, values);
      updatedRequisition = updateResult.rows[0];
    }

    // Update items if provided
    if (data.items) {
      // Delete existing items
      await client.query('DELETE FROM requisition_items WHERE requisition_id = $1', [id]);

      // Insert new items
      if (data.items.length > 0) {
        const itemInsertions = data.items.map(item =>
          client.query(
            `INSERT INTO requisition_items (
              requisition_id, item_id, quantity_expected, quantity_received, unit
            ) VALUES ($1, $2, $3, $4, $5)`,
            [id, item.item_id, item.quantity_expected, item.quantity_received, item.unit]
          )
        );
        await Promise.all(itemInsertions);
      }
    }

    await client.query('COMMIT');

    // Fetch updated requisition with items
    return await getSingleRequisition(id);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[UPDATE REQUISITION ERROR]', error);
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to update requisition'
    );
  } finally {
    client.release();
  }
};

const deleteRequisition = async (id: number): Promise<void> => {
  const result = await pool.query(
    'DELETE FROM requisitions WHERE id = $1 RETURNING *;',
    [id]
  );
  if (!result.rowCount) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Requisition not found');
  }
};

const getRequisitionStatsByDateRange = async (startDate: string, endDate: string) => {
  // Get daily statistics
  const dailyStatsQuery = `
    SELECT 
      COUNT(*) as total_requisitions,
      COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
      COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_count,
      COUNT(CASE WHEN status = 'received' THEN 1 END) as received_count,
      DATE(created_at) as date
    FROM requisitions 
    WHERE DATE(created_at) >= $1 AND DATE(created_at) <= $2
    GROUP BY DATE(created_at)
    ORDER BY date;
  `;

  const dailyResult = await pool.query(dailyStatsQuery, [startDate, endDate]);

  const branchStatsQuery = `
    SELECT 
      r.id as requisition_id,
      r.source_location_id,
      r.status,
      r.delivery_location_id,
      r.requisition_date,
      r.created_at,
      loc.name as location_name,
      delivery_loc.name as delivery_location_name,
      ri.item_id,
      ri.quantity_expected,
      ri.quantity_received,
      ri.unit,
      item.name as item_name,
      item.description as item_description
    FROM requisitions r
    LEFT JOIN locations loc ON r.source_location_id = loc.id
    LEFT JOIN locations delivery_loc ON r.delivery_location_id = delivery_loc.id
    LEFT JOIN requisition_items ri ON r.id = ri.requisition_id
    LEFT JOIN items item ON ri.item_id = item.id
    WHERE DATE(r.created_at) >= $1 AND DATE(r.created_at) <= $2
    ORDER BY r.created_at DESC, ri.item_id;
  `;

  const branchResult = await pool.query(branchStatsQuery, [startDate, endDate]);
  const branchData = branchResult.rows;

  // Group by location to get branch breakdown
  const branchBreakdown: Record<number, any> = {};
  const itemTotals: Record<number, any> = {};

  branchData.forEach(row => {
    const { 
      requisition_id, source_location_id, status, delivery_location_id, 
      delivery_location_name, requisition_date, created_at, location_name, item_id, 
      quantity_expected, quantity_received, unit, item_name, item_description 
    } = row;

    if (!branchBreakdown[source_location_id]) {
      branchBreakdown[source_location_id] = {
        location_id: source_location_id,
        location_name,
        total_requisitions: 0,
        pending_count: 0,
        approved_count: 0,
        received_count: 0,
        items: {},
        requisitions: []
      };
    }

    branchBreakdown[source_location_id].total_requisitions += 1;
    if (status === 'pending') branchBreakdown[source_location_id].pending_count += 1;
    if (status === 'approved') branchBreakdown[source_location_id].approved_count += 1;
    if (status === 'received') branchBreakdown[source_location_id].received_count += 1;

    const existingRequisition = branchBreakdown[source_location_id].requisitions.find(
      (r: any) => r.requisition_id === requisition_id
    );
    if (!existingRequisition) {
      branchBreakdown[source_location_id].requisitions.push({
        requisition_id,
        status,
        delivery_location_id,
        delivery_location_name,
        requisition_date,
        created_at,
        items: []
      });
    }


    const currentRequisition = branchBreakdown[source_location_id].requisitions.find(
      (r: any) => r.requisition_id === requisition_id
    );
    if (currentRequisition) {
      currentRequisition.items.push({
        item_id,
        item_name,
        item_description,
        quantity_expected,
        quantity_received,
        unit
      });
    }

    if (!itemTotals[item_id]) {
      itemTotals[item_id] = {
        item_id,
        item_name,
        item_description,
        total_quantity_requested: 0,
        total_quantity_received: 0,
        unit,
        total_requisitions: 0,
        branches_requesting: new Set()
      };
    }


    itemTotals[item_id].total_quantity_requested += quantity_expected || 0;
    itemTotals[item_id].total_quantity_received += quantity_received || 0;
    itemTotals[item_id].total_requisitions += 1;
    itemTotals[item_id].branches_requesting.add(source_location_id);
  });

  const formattedItemTotals = Object.values(itemTotals).map(item => ({
    ...item,
    branches_requesting: Array.from(item.branches_requesting),
    branch_count: item.branches_requesting.size
  }));

  const formattedBranchBreakdown = Object.values(branchBreakdown).map(branch => ({
    ...branch,
    items_summary: Object.values(branch.items).reduce((acc: any, item: any) => {
      if (!acc[item.item_id]) {
        acc[item.item_id] = {
          item_id: item.item_id,
          item_name: item.item_name,
          item_description: item.item_description,
          total_quantity_requested: 0,
          total_quantity_received: 0,
          unit: item.unit
        };
      }
      acc[item.item_id].total_quantity_requested += item.quantity_expected || 0;
      acc[item.item_id].total_quantity_received += item.quantity_received || 0;
      return acc;
    }, {})
  }));

  return {
    date_range: {
      start_date: startDate,
      end_date: endDate
    },
    daily_stats: dailyResult.rows,
    summary: {
      total_requisitions: dailyResult.rows.reduce((sum, row) => sum + parseInt(row.total_requisitions), 0),
      total_pending: dailyResult.rows.reduce((sum, row) => sum + parseInt(row.pending_count), 0),
      total_approved: dailyResult.rows.reduce((sum, row) => sum + parseInt(row.approved_count), 0),
      total_received: dailyResult.rows.reduce((sum, row) => sum + parseInt(row.received_count), 0),
    },
    branch_breakdown: formattedBranchBreakdown,
    items_analysis: formattedItemTotals
  };
};

const getRequisitionsByItemId = async (itemId: number): Promise<IRequisition[]> => {
  const query = `
    SELECT 
      r.*,
      row_to_json(source_loc) AS source_location,
      row_to_json(delivery_loc) AS delivery_location
    FROM requisitions r
    LEFT JOIN locations source_loc ON r.source_location_id = source_loc.id
    LEFT JOIN locations delivery_loc ON r.delivery_location_id = delivery_loc.id
    INNER JOIN requisition_items ri ON r.id = ri.requisition_id
    WHERE ri.item_id = $1
    ORDER BY r.created_at DESC;
  `;

  const result = await pool.query(query, [itemId]);
  const requisitions = result.rows;

  // Fetch items for each requisition
  const requisitionIds = requisitions.map(r => r.id);
  const itemsMap: Record<number, any[]> = {};

  if (requisitionIds.length > 0) {
    const itemsQuery = `
      SELECT 
        ri.*,
        row_to_json(item) AS item_details
      FROM requisition_items ri
      LEFT JOIN items item ON ri.item_id = item.id
      WHERE ri.requisition_id = ANY($1::int[])
      ORDER BY ri.created_at;
    `;
    const itemsResult = await pool.query(itemsQuery, [requisitionIds]);
    
    itemsResult.rows.forEach(row => {
      const { requisition_id, ...itemData } = row;
      if (!itemsMap[requisition_id]) itemsMap[requisition_id] = [];
      itemsMap[requisition_id].push(itemData);
    });
  }

  return requisitions.map(requisition => ({
    ...requisition,
    items: itemsMap[requisition.id] || [],
  }));
};

const getRequisitionsByDestinationLocation = async (locationId: number): Promise<IRequisition[]> => {
  const query = `
    SELECT 
      r.*,
      row_to_json(source_loc) AS source_location,
      row_to_json(delivery_loc) AS delivery_location
    FROM requisitions r
    LEFT JOIN locations source_loc ON r.source_location_id = source_loc.id
    LEFT JOIN locations delivery_loc ON r.delivery_location_id = delivery_loc.id
    WHERE r.delivery_location_id = $1
    ORDER BY r.created_at DESC;
  `;

  const result = await pool.query(query, [locationId]);
  const requisitions = result.rows;

  // Fetch items for each requisition
  const requisitionIds = requisitions.map(r => r.id);
  const itemsMap: Record<number, any[]> = {};

  if (requisitionIds.length > 0) {
    const itemsQuery = `
      SELECT 
        ri.*,
        row_to_json(item) AS item_details
      FROM requisition_items ri
      LEFT JOIN items item ON ri.item_id = item.id
      WHERE ri.requisition_id = ANY($1::int[])
      ORDER BY ri.created_at;
    `;
    const itemsResult = await pool.query(itemsQuery, [requisitionIds]);
    
    itemsResult.rows.forEach(row => {
      const { requisition_id, ...itemData } = row;
      if (!itemsMap[requisition_id]) itemsMap[requisition_id] = [];
      itemsMap[requisition_id].push(itemData);
    });
  }

  return requisitions.map(requisition => ({
    ...requisition,
    items: itemsMap[requisition.id] || [],
  }));
};

const getRequisitionsByStatus = async (status: 'pending' | 'approved' | 'received'): Promise<IRequisition[]> => {
  const query = `
    SELECT 
      r.*,
      row_to_json(source_loc) AS source_location,
      row_to_json(delivery_loc) AS delivery_location
    FROM requisitions r
    LEFT JOIN locations source_loc ON r.source_location_id = source_loc.id
    LEFT JOIN locations delivery_loc ON r.delivery_location_id = delivery_loc.id
    WHERE r.status = $1
    ORDER BY r.created_at DESC;
  `;

  const result = await pool.query(query, [status]);
  const requisitions = result.rows;

  // Fetch items for each requisition
  const requisitionIds = requisitions.map(r => r.id);
  const itemsMap: Record<number, any[]> = {};

  if (requisitionIds.length > 0) {
    const itemsQuery = `
      SELECT 
        ri.*,
        row_to_json(item) AS item_details
      FROM requisition_items ri
      LEFT JOIN items item ON ri.item_id = item.id
      WHERE ri.requisition_id = ANY($1::int[])
      ORDER BY ri.created_at;
    `;
    const itemsResult = await pool.query(itemsQuery, [requisitionIds]);
    
    itemsResult.rows.forEach(row => {
      const { requisition_id, ...itemData } = row;
      if (!itemsMap[requisition_id]) itemsMap[requisition_id] = [];
      itemsMap[requisition_id].push(itemData);
    });
  }

  return requisitions.map(requisition => ({
    ...requisition,
    items: itemsMap[requisition.id] || [],
  }));
};

const getRequisitionsByDateRange = async (startDate: string, endDate: string): Promise<IRequisition[]> => {
  const query = `
    SELECT 
      r.*,
      row_to_json(source_loc) AS source_location,
      row_to_json(delivery_loc) AS delivery_location
    FROM requisitions r
    LEFT JOIN locations source_loc ON r.source_location_id = source_loc.id
    LEFT JOIN locations delivery_loc ON r.delivery_location_id = delivery_loc.id
    WHERE DATE(r.created_at) >= $1 AND DATE(r.created_at) <= $2
    ORDER BY r.created_at DESC;
  `;

  const result = await pool.query(query, [startDate, endDate]);
  const requisitions = result.rows;

  // Fetch items for each requisition
  const requisitionIds = requisitions.map(r => r.id);
  const itemsMap: Record<number, any[]> = {};

  if (requisitionIds.length > 0) {
    const itemsQuery = `
      SELECT 
        ri.*,
        row_to_json(item) AS item_details
      FROM requisition_items ri
      LEFT JOIN items item ON ri.item_id = item.id
      WHERE ri.requisition_id = ANY($1::int[])
      ORDER BY ri.created_at;
    `;
    const itemsResult = await pool.query(itemsQuery, [requisitionIds]);
    
    itemsResult.rows.forEach(row => {
      const { requisition_id, ...itemData } = row;
      if (!itemsMap[requisition_id]) itemsMap[requisition_id] = [];
      itemsMap[requisition_id].push(itemData);
    });
  }

  return requisitions.map(requisition => ({
    ...requisition,
    items: itemsMap[requisition.id] || [],
  }));
};

const getRequisitionsByUser = async (userId: number): Promise<IRequisition[]> => {
  const query = `
    SELECT 
      r.*,
      row_to_json(source_loc) AS source_location,
      row_to_json(delivery_loc) AS delivery_location
    FROM requisitions r
    LEFT JOIN locations source_loc ON r.source_location_id = source_loc.id
    LEFT JOIN locations delivery_loc ON r.delivery_location_id = delivery_loc.id
    WHERE r.created_by = $1
    ORDER BY r.created_at DESC;
  `;

  const result = await pool.query(query, [userId]);
  const requisitions = result.rows;

  // Fetch items for each requisition
  const requisitionIds = requisitions.map(r => r.id);
  const itemsMap: Record<number, any[]> = {};

  if (requisitionIds.length > 0) {
    const itemsQuery = `
      SELECT 
        ri.*,
        row_to_json(item) AS item_details
      FROM requisition_items ri
      LEFT JOIN items item ON ri.item_id = item.id
      WHERE ri.requisition_id = ANY($1::int[])
      ORDER BY ri.created_at;
    `;
    const itemsResult = await pool.query(itemsQuery, [requisitionIds]);
    
    itemsResult.rows.forEach(row => {
      const { requisition_id, ...itemData } = row;
      if (!itemsMap[requisition_id]) itemsMap[requisition_id] = [];
      itemsMap[requisition_id].push(itemData);
    });
  }

  return requisitions.map(requisition => ({
    ...requisition,
    items: itemsMap[requisition.id] || [],
  }));
};

const approveRequisition = async (id: number): Promise<IRequisition> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check if requisition exists and is pending
    const existingResult = await client.query(
      'SELECT * FROM requisitions WHERE id = $1 AND status = $2',
      [id, 'pending']
    );

    if (!existingResult.rows.length) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Requisition not found or not in pending status');
    }

    // Update status to approved
    const updateResult = await client.query(
      'UPDATE requisitions SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      ['approved', id]
    );

    await client.query('COMMIT');

    // Fetch updated requisition with items
    return await getSingleRequisition(id);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[APPROVE REQUISITION ERROR]', error);
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to approve requisition'
    );
  } finally {
    client.release();
  }
};

const markRequisitionAsReceived = async (id: number, itemsReceived: IRequisitionItemReceived[]): Promise<IRequisition> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check if requisition exists and is approved
    const existingResult = await client.query(
      'SELECT * FROM requisitions WHERE id = $1 AND status = $2',
      [id, 'approved']
    );

    if (!existingResult.rows.length) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Requisition not found or not in approved status');
    }

    // Update requisition items with received quantities
    for (const item of itemsReceived) {
      await client.query(
        `UPDATE requisition_items 
         SET quantity_received = $1, updated_at = NOW() 
         WHERE requisition_id = $2 AND item_id = $3`,
        [item.quantity_received, id, item.item_id]
      );
    }

    // Update requisition status to received
    await client.query(
      'UPDATE requisitions SET status = $1, updated_at = NOW() WHERE id = $2',
      ['received', id]
    );

    await client.query('COMMIT');

    // Fetch updated requisition with items
    return await getSingleRequisition(id);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[MARK REQUISITION AS RECEIVED ERROR]', error);
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to mark requisition as received'
    );
  } finally {
    client.release();
  }
};

export const RequisitionService = {
  createRequisition,
  getAllRequisitions,
  getPendingRequisitionsAnalysis,
  getSingleRequisition,
  updateRequisition,
  deleteRequisition,
  getRequisitionStatsByDateRange,
  getRequisitionsByItemId,
  getRequisitionsByDestinationLocation,
  getRequisitionsByStatus,
  getRequisitionsByDateRange,
  getRequisitionsByUser,
  approveRequisition,
  markRequisitionAsReceived,
};
