import { Request, Response } from 'express';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import httpStatus from 'http-status';
import pick from '../../../shared/pick';
import { paginationFields } from '../../../constants/pagination';
import { LocationStockService } from './locationStocks.service';
import ApiError from '../../../errors/ApiError';

const createLocationStock = catchAsync(async (req: Request, res: Response) => {
  const result = await LocationStockService.createLocationStock(req.body);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Location stock record created successfully!',
    data: result,
  });
});

const getLocationStock = catchAsync(async (req: Request, res: Response) => {
  const locationId = Number(req.params.locationId);
  const itemId = Number(req.params.itemId);
  const result = await LocationStockService.getLocationStock(locationId, itemId);

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Location stock record not found');
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Location stock record retrieved successfully!',
    data: result,
  });
});

const getAllLocationStocks = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, [
    'searchTerm',
    'item_id',
    'location_id',
  ]);
  const paginationOptions = pick(req.query, paginationFields);

  const result = await LocationStockService.getAllLocationStocks(filters, paginationOptions);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Location stock records retrieved successfully!',
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

const getLocationStocksByLocation = catchAsync(async (req: Request, res: Response) => {
  const locationId = Number(req.params.locationId);
  const paginationOptions = pick(req.query, paginationFields);

  const result = await LocationStockService.getLocationStocksByLocation(locationId, paginationOptions);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `Location stock records for location ${locationId} retrieved successfully!`,
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

const updateLocationStock = catchAsync(async (req: Request, res: Response) => {
  const locationId = Number(req.params.locationId);
  const itemId = Number(req.params.itemId);
  const result = await LocationStockService.updateLocationStock(locationId, itemId, req.body);

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Location stock record not found');
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Location stock record updated successfully!',
    data: result,
  });
});

const updateLocationStockQuantity = catchAsync(async (req: Request, res: Response) => {
  const locationId = Number(req.params.locationId);
  const itemId = Number(req.params.itemId);
  const { quantity, operation, quantityType } = req.body;

  if (!quantity || !operation || !quantityType) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Quantity, operation, and quantityType are required');
  }

  const result = await LocationStockService.updateLocationStockQuantity(
    locationId,
    itemId,
    quantity,
    operation,
    quantityType
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Location stock quantity updated successfully!',
    data: result,
  });
});

const bulkUpdateLocationStocks = catchAsync(async (req: Request, res: Response) => {
  const { location_id, updates } = req.body;
  const result = await LocationStockService.bulkUpdateLocationStocks(location_id, updates);

  const hasErrors = result.errors.length > 0;
  const statusCode = hasErrors ? httpStatus.PARTIAL_CONTENT : httpStatus.OK;

  sendResponse(res, {
    statusCode,
    success: true,
    message: hasErrors 
      ? `Bulk update completed with ${result.success.length} successes and ${result.errors.length} errors`
      : `All ${result.success.length} location stock records updated successfully!`,
    data: {
      updated: result.success,
      errors: result.errors,
      summary: {
        total: updates.length,
        successful: result.success.length,
        failed: result.errors.length,
      }
    },
  });
});

const checkStockAvailability = catchAsync(async (req: Request, res: Response) => {
  const locationId = Number(req.params.locationId);
  const { items } = req.body;

  if (!items || !Array.isArray(items)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Items array is required');
  }

  const result = await LocationStockService.checkStockAvailability(locationId, items);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Stock availability check completed successfully!',
    data: result,
  });
});

export const LocationStockController = {
  createLocationStock,
  getLocationStock,
  getAllLocationStocks,
  getLocationStocksByLocation,
  updateLocationStock,
  updateLocationStockQuantity,
  bulkUpdateLocationStocks,
  checkStockAvailability,
};
