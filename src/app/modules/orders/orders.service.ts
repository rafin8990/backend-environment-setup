import httpStatus from 'http-status';
import ApiError from '../../../errors/ApiError';
import pool from '../../../utils/dbClient';
import { IOrder, IOrderItem } from './orders.interface';
import { IPaginationOptions } from '../../../interfaces/pagination';
import { IGenericResponse } from '../../../interfaces/common';
import { paginationHelpers } from '../../../helpers/paginationHelper';
import LowStockAlertScheduler from '../LowStockAlerts/lowStockAlerts.scheduler';

type CreateOrderResult = IOrder | { success: false; message: string };

const createOrder = async (
  data: IOrder
): Promise<CreateOrderResult> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Check stock availability for each item before proceeding (but don't deduct yet)
    if (data.order_items?.length) {
      for (const item of data.order_items) {
        const stockRes = await client.query(
          'SELECT stock_quantity FROM items WHERE id = $1 FOR UPDATE',
          [item.item_id]
        );
        if (!stockRes.rows.length) {
          await client.query('ROLLBACK');
          return { success: false, message: `Item with id ${item.item_id} not found` };
        }
        const stockQty = parseFloat(stockRes.rows[0].stock_quantity);
        if (stockQty === 0 || item.quantity > stockQty) {
          await client.query('ROLLBACK');
          return { success: false, message: `Stock is not available for item: ${item.item_id}. Available stock: ${stockQty}` };
        }
      }
    }
    const insertOrderQuery = `
      INSERT INTO orders (
        status, approver_id, created_at, updated_at
      ) VALUES (
        $1, $2, NOW(), NOW()
      ) RETURNING *;
    `;
    const orderValues = [
      data.status ?? null,
      data.approver_id ?? null,
    ];
    const orderResult = await client.query(insertOrderQuery, orderValues);
    const createdOrder = orderResult.rows[0];
    if (data.order_items?.length) {
      const itemInsertions = data.order_items.map(item => {
        // Ensure quantity is a number
        const quantity = typeof item.quantity === 'string' ? parseFloat(item.quantity) : item.quantity;
        
        return client.query(
          `INSERT INTO order_items (
            order_id, item_id, quantity
          ) VALUES ($1, $2, $3);`,
          [
            createdOrder.id,
            item.item_id,
            quantity,
          ]
        );
      });
      await Promise.all(itemInsertions);
      
      // Only deduct stock if the order is immediately approved
      if (data.status === 'approved') {
        const stockUpdates = data.order_items.map(item =>
          client.query(
            `UPDATE items SET stock_quantity = stock_quantity - $1 WHERE id = $2;`,
            [item.quantity, item.item_id]
          )
        );
        await Promise.all(stockUpdates);
        
        // Also update the stocks table to keep it in sync
        const stocksUpdates = data.order_items.map(item =>
          client.query(
            'UPDATE stocks SET physical_stock_count = physical_stock_count - $1 WHERE item_id = $2',
            [item.quantity, item.item_id]
          )
        );
        await Promise.all(stocksUpdates);
      }
    }
    await client.query('COMMIT');
    
    // Trigger low stock check after order creation
    try {
      const scheduler = LowStockAlertScheduler.getInstance();
      await scheduler.checkAllItemsForLowStock();
    } catch (error) {
      console.error('[LOW STOCK CHECK ERROR]', error);
      // Don't fail the order creation if low stock check fails
    }
    
    return {
      ...createdOrder,
      order_items: data.order_items ?? [],
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[CREATE ORDER ERROR]', error);
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to create order'
    );
  } finally {
    client.release();
  }
};

const getAllOrders = async (
  filters: any,
  paginationOptions: IPaginationOptions
): Promise<IGenericResponse<any[]>> => {
  const { searchTerm, ...filterFields } = filters;
  const {
    page,
    limit,
    skip,
    sortBy = 'created_at',
    sortOrder = 'desc',
  } = paginationHelpers.calculatePagination(paginationOptions);
  const conditions: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;
  if (searchTerm) {
    const searchable = [
      'status'
    ];
    conditions.push(
      `(${searchable
        .map(field => `o.${field} ILIKE $${paramIndex++}`)
        .join(' OR ')})`
    );
    searchable.forEach(() => values.push(`%${searchTerm}%`));
  }
  for (const [field, value] of Object.entries(filterFields)) {
    if (value !== undefined && value !== null) {
      conditions.push(`o.${field} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }
  }
  const whereClause = conditions.length
    ? `WHERE ${conditions.join(' AND ')}`
    : '';
  const orderQuery = `
    SELECT
      o.*
    FROM orders o
    ${whereClause}
    ORDER BY o.${sortBy} ${sortOrder}
    LIMIT $${paramIndex++} OFFSET $${paramIndex};
  `;
  values.push(limit, skip);
  const ordersResult = await pool.query(orderQuery, values);
  const orders: any[] = ordersResult.rows;
  const orderIds = orders.map(order => order.id);
  const orderItemMap: Record<number, any[]> = {};
  if (orderIds.length) {
    const orderItemQuery = `
      SELECT oi.*, i.name as item_name, i.unit as item_unit, i.stock_quantity as item_stock_quantity
      FROM order_items oi
      JOIN items i ON oi.item_id = i.id
      WHERE oi.order_id = ANY($1::int[]);
    `;
    const orderItemsResult = await pool.query(orderItemQuery, [orderIds]);
    orderItemsResult.rows.forEach(row => {
      const { order_id, ...orderItemData } = row;
      if (!orderItemMap[order_id]) orderItemMap[order_id] = [];
      orderItemMap[order_id].push(orderItemData);
    });
  }
  const enrichedOrders = orders.map(order => ({
    ...order,
    order_items: orderItemMap[order.id] || [],
  }));
  const countQuery = `SELECT COUNT(*) FROM orders o ${whereClause};`;
  const countResult = await pool.query(
    countQuery,
    values.slice(0, paramIndex - 2)
  );
  const total = parseInt(countResult.rows[0].count, 10);
  return {
    meta: { page, limit, total },
    data: enrichedOrders,
  };
};

const getSingleOrder = async (id: number): Promise<any> => {
  const client = await pool.connect();
  try {
    const orderQuery = `
      SELECT
        o.*
      FROM orders o
      WHERE o.id = $1
    `;
    const orderResult = await client.query(orderQuery, [id]);
    if (orderResult.rows.length === 0) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Order not found');
    }
    const order = orderResult.rows[0];
    const orderItemsQuery = `
      SELECT oi.*, i.name as item_name, i.unit as item_unit, i.stock_quantity as item_stock_quantity
      FROM order_items oi
      JOIN items i ON oi.item_id = i.id
      WHERE oi.order_id = $1
    `;
    const orderItemsResult = await client.query(orderItemsQuery, [id]);
    return {
      ...order,
      order_items: orderItemsResult.rows,
    };
  } finally {
    client.release();
  }
};

const updateOrder = async (
  id: number,
  data: Partial<IOrder> & { order_items?: IOrderItem[] }
): Promise<any> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Get current order status to compare with new status
    const currentOrderResult = await client.query('SELECT status FROM orders WHERE id = $1', [id]);
    if (!currentOrderResult.rows.length) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Order not found');
    }
    const currentStatus = currentOrderResult.rows[0].status;
    
    const updatableFields = [
      'status',
      'approver_id',
    ];
    const updates = [];
    const values = [];
    let paramIndex = 1;
    for (const field of updatableFields) {
      if (data[field as keyof IOrder] !== undefined) {
        updates.push(`${field} = $${paramIndex++}`);
        values.push(data[field as keyof IOrder]);
      }
    }
    if (updates.length) {
      values.push(id);
      await client.query(
        `UPDATE orders SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex}`,
        values
      );
    }
    
    // Update order items first if provided
    if (data.order_items && Array.isArray(data.order_items)) {
      await client.query(
        `DELETE FROM order_items WHERE order_id = $1`,
        [id]
      );
      const itemInsertions = data.order_items.map(item => {
        // Ensure quantity is a number
        const quantity = typeof item.quantity === 'string' ? parseFloat(item.quantity) : item.quantity;
        console.log(`Inserting item: item_id=${item.item_id}, quantity=${quantity}, type=${typeof quantity}`);
        
        return client.query(
          `INSERT INTO order_items (
            order_id, item_id, quantity
          ) VALUES ($1, $2, $3);`,
          [
            id,
            item.item_id,
            quantity,
          ]
        );
      });
      await Promise.all(itemInsertions);
    }
    
    // Handle stock deduction when order status changes to approved
    if (data.status === 'approved' && currentStatus !== 'approved') {
      // Get current order items for stock deduction (either updated or existing)
      const orderItemsResult = await client.query(
        'SELECT item_id, quantity FROM order_items WHERE order_id = $1',
        [id]
      );
      
      // Check stock availability before deducting
      for (const item of orderItemsResult.rows) {
        const stockRes = await client.query(
          'SELECT stock_quantity FROM items WHERE id = $1 FOR UPDATE',
          [item.item_id]
        );
        if (!stockRes.rows.length) {
          throw new ApiError(httpStatus.NOT_FOUND, `Item with id ${item.item_id} not found`);
        }
        const stockQty = parseFloat(stockRes.rows[0].stock_quantity);
        const requiredQty = parseFloat(item.quantity);
        if (stockQty < requiredQty) {
          throw new ApiError(
            httpStatus.BAD_REQUEST, 
            `Insufficient stock for item ${item.item_id}. Available: ${stockQty}, Required: ${requiredQty}`
          );
        }
      }
      
      // Deduct stock for each item
      const stockUpdates = orderItemsResult.rows.map(item =>
        client.query(
          'UPDATE items SET stock_quantity = stock_quantity - $1 WHERE id = $2',
          [item.quantity, item.item_id]
        )
      );
      await Promise.all(stockUpdates);
      
      // Also update the stocks table to keep it in sync
      const stocksUpdates = orderItemsResult.rows.map(item =>
        client.query(
          'UPDATE stocks SET physical_stock_count = physical_stock_count - $1 WHERE item_id = $2',
          [item.quantity, item.item_id]
        )
      );
      await Promise.all(stocksUpdates);
    }
    
    await client.query('COMMIT');
    
    // Trigger low stock check after order update
    try {
      const scheduler = LowStockAlertScheduler.getInstance();
      await scheduler.checkAllItemsForLowStock();
    } catch (error) {
      console.error('[LOW STOCK CHECK ERROR]', error);
      // Don't fail the order update if low stock check fails
    }
    
    const finalOrderRes = await client.query(
      `SELECT * FROM orders WHERE id = $1`,
      [id]
    );
    const finalItemsRes = await client.query(
      `SELECT * FROM order_items WHERE order_id = $1`,
      [id]
    );
    return {
      ...finalOrderRes.rows[0],
      order_items: finalItemsRes.rows,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[UPDATE ORDER ERROR]', error);
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to update order'
    );
  } finally {
    client.release();
  }
};

const removeOrder = async (id: number): Promise<void> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Check if order exists
    const orderResult = await client.query('SELECT id FROM orders WHERE id = $1', [id]);
    if (orderResult.rows.length === 0) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Order not found');
    }
    // Delete order_items first due to FK constraint
    await client.query('DELETE FROM order_items WHERE order_id = $1', [id]);
    // Delete the order
    await client.query('DELETE FROM orders WHERE id = $1', [id]);
    await client.query('COMMIT');
    
    // Trigger low stock check after order removal
    try {
      const scheduler = LowStockAlertScheduler.getInstance();
      await scheduler.checkAllItemsForLowStock();
    } catch (error) {
      console.error('[LOW STOCK CHECK ERROR]', error);
      // Don't fail the order removal if low stock check fails
    }
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[REMOVE ORDER ERROR]', error);
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to remove order'
    );
  } finally {
    client.release();
  }
};

export const OrderService = {
  createOrder,
  getAllOrders,
  getSingleOrder,
  updateOrder,
  removeOrder,
};