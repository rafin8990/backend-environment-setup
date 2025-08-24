import catchAsync from '../../../shared/catchAsync';
import { Request, Response } from 'express';
import { IItem } from './items.interface';
import { ItemService } from './items.service';
import sendResponse from '../../../shared/sendResponse';
import httpStatus from 'http-status';
import pick from '../../../shared/pick';
import { paginationFields } from '../../../constants/pagination';
import { paginationHelpers } from '../../../helpers/paginationHelper';

const createItem = catchAsync(async (req: Request, res: Response) => {
  const itemData = req.body as IItem;

  const result = await ItemService.createItem(itemData);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Item created successfully!',
    data: result,
  });
});

const getAllItems = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, [
    'searchTerm',
    'name',
    'type_id',
    'category_id',
    'supplier_id',
    'location_id',
    'status',
    'tag_id',
  ]);
  const paginationOptions = pick(req.query, paginationFields);

  // Convert tag_id to number if it exists
  const processedFilters: any = { ...filters };
  if (processedFilters.tag_id) {
    processedFilters.tag_id = Number(processedFilters.tag_id);
  }

  const result = await ItemService.getAllItems(processedFilters, paginationOptions);

  const paginationMeta = result.meta
    ? {
        page: result.meta.page ?? 1,
        limit: result.meta.limit ?? 10,
        total: result.meta.total ?? 0,
        ...paginationHelpers.calculatePaginationMetadata(
          result.meta.page ?? 1,
          result.meta.limit ?? 10,
          result.meta.total ?? 0
        ),
      }
    : undefined;

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Items retrieved successfully!',
    meta: paginationMeta,
    data: result.data,
  });
});

const getSingleItem = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const result = await ItemService.getSingleItem(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Item retrieved successfully!',
    data: result,
  });
});

const updateItem = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const updateData = req.body;

  const result = await ItemService.updateItem(id, updateData);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Item updated successfully!',
    data: result,
  });
});

const deleteItem = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  await ItemService.deleteItem(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Item deleted successfully!',
  });
});

export const ItemController = {
  createItem,
  getAllItems,
  getSingleItem,
  updateItem,
  deleteItem,
};
