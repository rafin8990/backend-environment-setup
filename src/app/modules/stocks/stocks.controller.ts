import { Request, Response } from 'express';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import httpStatus from 'http-status';
import pick from '../../../shared/pick';
import { paginationFields } from '../../../constants/pagination';
import { StockService } from './stocks.service';
import ApiError from '../../../errors/ApiError';

const createStock = catchAsync(async (req: Request, res: Response) => {
  const result = await StockService.createStock(req.body);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Stock record created successfully!',
    data: result,
  });
});

const getAllStocks = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, [
    'searchTerm',
    'item_id',
    'location_id', // NEW: Added location filter
    'counted_from',
    'counted_to',
    'counted_by'
  ]);
  const paginationOptions = pick(req.query, paginationFields);

  const result = await StockService.getAllStocks(filters, paginationOptions);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Stock records retrieved successfully!',
    meta: result.meta
      ? {
          page: result.meta.page ?? 1,
          limit: result.meta.limit ?? 10,
          total: result.meta.total,
        }
      : undefined,
    data: result.data,
  });
});

const getSingleStock = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const result = await StockService.getSingleStock(id);

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Stock record not found');
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Stock record retrieved successfully!',
    data: result,
  });
});

const getStocksByItem = catchAsync(async (req: Request, res: Response) => {
  const itemId = Number(req.params.itemId);
  const paginationOptions = pick(req.query, paginationFields);

  const result = await StockService.getStocksByItem(itemId, paginationOptions);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `Stock records for item ${itemId} retrieved successfully!`,
    meta: result.meta
      ? {
          page: result.meta.page ?? 1,
          limit: result.meta.limit ?? 10,
          total: result.meta.total,
        }
      : undefined,
    data: result.data,
  });
});

const getStocksByLocation = catchAsync(async (req: Request, res: Response) => {
  const locationId = Number(req.params.locationId);
  const paginationOptions = pick(req.query, paginationFields);

  const result = await StockService.getStocksByLocation(locationId, paginationOptions);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `Stock records for location ${locationId} retrieved successfully!`,
    meta: result.meta
      ? {
          page: result.meta.page ?? 1,
          limit: result.meta.limit ?? 10,
          total: result.meta.total,
        }
      : undefined,
    data: result.data,
  });
});

const getLatestStockByItem = catchAsync(async (req: Request, res: Response) => {
  const itemId = Number(req.params.itemId);
  const result = await StockService.getLatestStockByItem(itemId);

  if (!result) {
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: `No stock records found for item ${itemId}`,
      data: null,
    });
    return;
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `Latest stock record for item ${itemId} retrieved successfully!`,
    data: result,
  });
});

const updateStock = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const result = await StockService.updateStock(id, req.body);

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Stock record not found');
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Stock record updated successfully!',
    data: result,
  });
});

const deleteStock = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const stock = await StockService.getSingleStock(id);

  if (!stock) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Stock record not found');
  }

  await StockService.deleteStock(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Stock record deleted successfully!',
  });
});

const bulkCreateStocks = catchAsync(async (req: Request, res: Response) => {
  const { stocks } = req.body;
  const result = await StockService.bulkCreateStocks(stocks);

  const hasErrors = result.errors.length > 0;
  const statusCode = hasErrors ? httpStatus.PARTIAL_CONTENT : httpStatus.CREATED;

  sendResponse(res, {
    statusCode,
    success: true,
    message: hasErrors 
      ? `Bulk create completed with ${result.success.length} successes and ${result.errors.length} errors`
      : `All ${result.success.length} stock records created successfully!`,
    data: {
      created: result.success,
      errors: result.errors,
      summary: {
        total: stocks.length,
        successful: result.success.length,
        failed: result.errors.length,
      }
    },
  });
});

const bulkUpdateStocks = catchAsync(async (req: Request, res: Response) => {
  const { stocks } = req.body;
  const result = await StockService.bulkUpdateStocks(stocks);

  const hasErrors = result.errors.length > 0;
  const statusCode = hasErrors ? httpStatus.PARTIAL_CONTENT : httpStatus.OK;

  sendResponse(res, {
    statusCode,
    success: true,
    message: hasErrors 
      ? `Bulk update completed with ${result.success.length} successes and ${result.errors.length} errors`
      : `All ${result.success.length} stock records updated successfully!`,
    data: {
      updated: result.success,
      errors: result.errors,
      summary: {
        total: stocks.length,
        successful: result.success.length,
        failed: result.errors.length,
      }
    },
  });
});

export const StockController = {
  createStock,
  getAllStocks,
  getSingleStock,
  getStocksByItem,
  getStocksByLocation,
  getLatestStockByItem,
  updateStock,
  deleteStock,
  bulkCreateStocks,
  bulkUpdateStocks,
};
