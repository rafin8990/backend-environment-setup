import { Request, Response } from 'express';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import httpStatus from 'http-status';
import pick from '../../../shared/pick';
import { paginationFields } from '../../../constants/pagination';
import { StockMovementService } from './stockMovements.service';
import ApiError from '../../../errors/ApiError';

const recordStockMovement = catchAsync(async (req: Request, res: Response) => {
  const result = await StockMovementService.recordStockMovement(req.body);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Stock movement recorded successfully!',
    data: result,
  });
});

const getStockMovementHistory = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, [
    'searchTerm',
    'item_id',
    'location_id',
    'movement_type',
    'reference_type',
    'reference_id',
    'date_from',
    'date_to',
  ]);
  const paginationOptions = pick(req.query, paginationFields);

  const result = await StockMovementService.getStockMovementHistory(filters, paginationOptions);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Stock movement history retrieved successfully!',
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

const getStockMovementsByItem = catchAsync(async (req: Request, res: Response) => {
  const itemId = Number(req.params.itemId);
  const locationId = req.query.location_id ? Number(req.query.location_id) : undefined;
  const paginationOptions = pick(req.query, paginationFields);

  const result = await StockMovementService.getStockMovementsByItem(itemId, locationId, paginationOptions);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `Stock movements for item ${itemId} retrieved successfully!`,
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

const getStockMovementsByLocation = catchAsync(async (req: Request, res: Response) => {
  const locationId = Number(req.params.locationId);
  const paginationOptions = pick(req.query, paginationFields);

  const result = await StockMovementService.getStockMovementsByLocation(locationId, paginationOptions);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `Stock movements for location ${locationId} retrieved successfully!`,
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

const getStockMovementsByReference = catchAsync(async (req: Request, res: Response) => {
  const { referenceType, referenceId } = req.params;

  if (!referenceType || !referenceId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Reference type and ID are required');
  }

  const result = await StockMovementService.getStockMovementsByReference(referenceType, Number(referenceId));

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `Stock movements for ${referenceType} ${referenceId} retrieved successfully!`,
    data: result,
  });
});

const getStockMovementSummary = catchAsync(async (req: Request, res: Response) => {
  const { location_id, item_id, date_from, date_to } = req.query;

  const result = await StockMovementService.getStockMovementSummary(
    location_id ? Number(location_id) : undefined,
    item_id ? Number(item_id) : undefined,
    date_from as string | undefined,
    date_to as string | undefined
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Stock movement summary retrieved successfully!',
    data: result,
  });
});

export const StockMovementController = {
  recordStockMovement,
  getStockMovementHistory,
  getStockMovementsByItem,
  getStockMovementsByLocation,
  getStockMovementsByReference,
  getStockMovementSummary,
};
