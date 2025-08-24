import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { LowStockAlertService } from './lowStockAlerts.service';
import pick from '../../../shared/pick';
import { paginationFields } from '../../../constants/pagination';

const getAllLowStockAlerts = catchAsync(async (req: Request, res: Response) => {
  const filterFields = [
    'searchTerm',
    'item_id', 
    'current_stock', 
    'min_stock_threshold', 
    'alert_created_at', 
    'resolved', 
    'notes',
    'item_name',
    'item_status',
    'supplier_id',
    'category_id',
    'type_id',
    'location_id',
    'supplier_name',
    'category_name',
    'type_name',
    'location_name',
  ];
  const filters = pick(req.query, filterFields);
  const paginationOptions = pick(req.query, paginationFields);
  const result = await LowStockAlertService.getAllLowStockAlerts(filters, paginationOptions);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Low stock alerts retrieved successfully',
    data: result.data,
    meta: result.meta
      ? {
          page: result.meta.page ?? 1,
          limit: result.meta.limit ?? 10,
          total: result.meta.total,
        }
      : undefined,
  });
});

const getSingleLowStockAlert = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id;
  try {
    const result = await LowStockAlertService.getSingleLowStockAlert(id);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Low stock alert retrieved successfully',
      data: result,
    });
  } catch (error: any) {
    if (error.statusCode === httpStatus.NOT_FOUND) {
      throw error;
    }
    throw new (await import('../../../errors/ApiError')).default(
      (await import('http-status')).default.INTERNAL_SERVER_ERROR,
      'Unable to retrieve low stock alert'
    );
  }
});

const createLowStockAlert = catchAsync(async (req: Request, res: Response) => {
  try {
    const result = await LowStockAlertService.createLowStockAlert(req.body);
    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: 'Low stock alert created successfully',
      data: result,
    });
  } catch (error: any) {
    if (error.statusCode === httpStatus.BAD_REQUEST || error.statusCode === httpStatus.NOT_FOUND) {
      throw error;
    }
    throw new (await import('../../../errors/ApiError')).default(
      (await import('http-status')).default.INTERNAL_SERVER_ERROR,
      'Unable to create low stock alert'
    );
  }
});

const updateLowStockAlert = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id;
  try {
    const result = await LowStockAlertService.updateLowStockAlert(id, req.body);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Low stock alert updated successfully',
      data: result,
    });
  } catch (error: any) {
    if (error.statusCode === httpStatus.NOT_FOUND || error.statusCode === httpStatus.BAD_REQUEST) {
      throw error;
    }
    throw new (await import('../../../errors/ApiError')).default(
      (await import('http-status')).default.INTERNAL_SERVER_ERROR,
      'Unable to update low stock alert'
    );
  }
});

const deleteLowStockAlert = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id;
  try {
    await LowStockAlertService.deleteLowStockAlert(id);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Low stock alert deleted successfully',
      data: null,
    });
  } catch (error: any) {
    if (error.statusCode === httpStatus.NOT_FOUND) {
      throw error;
    }
    throw new (await import('../../../errors/ApiError')).default(
      (await import('http-status')).default.INTERNAL_SERVER_ERROR,
      'Unable to delete low stock alert'
    );
  }
});

const deleteAllLowStockAlerts = catchAsync(async (req: Request, res: Response) => {
  try {
    await LowStockAlertService.deleteAllLowStockAlerts();
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'All low stock alerts deleted successfully',
      data: null,
    });
  } catch (error: any) {
    throw new (await import('../../../errors/ApiError')).default(
      (await import('http-status')).default.INTERNAL_SERVER_ERROR,
      'Unable to delete all low stock alerts'
    );
  }
});

export const LowStockAlertController = {
  getAllLowStockAlerts,
  getSingleLowStockAlert,
  createLowStockAlert,
  updateLowStockAlert,
  deleteLowStockAlert,
  deleteAllLowStockAlerts,
};