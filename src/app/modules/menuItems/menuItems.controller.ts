import { Request, Response } from 'express';
import httpStatus from 'http-status';
import { paginationFields } from '../../../constants/pagination';
import { paginationHelpers } from '../../../helpers/paginationHelper';
import catchAsync from '../../../shared/catchAsync';
import pick from '../../../shared/pick';
import sendResponse from '../../../shared/sendResponse';
import { MenuItem } from './menuItems.interface';
import { MenuItemService } from './menuItems.service';

const createMenuItem = catchAsync(async (req: Request, res: Response) => {
  const data = req.body;
  const result = await MenuItemService.createMenuItem(data);
  sendResponse<MenuItem>(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Menu item created successfully',
    data: result,
  });
});

const getAllMenuItems = catchAsync(async (req: Request, res: Response) => {
  const rawFilters = pick(req.query, ['searchTerm', 'parent_id', 'flattened']);
  const paginationOptions = pick(req.query, paginationFields);

  // Convert flattened string to boolean and properly type the filters
  const filters: any = {
    ...rawFilters,
    flattened: rawFilters.flattened === 'true'
  };

  const result = await MenuItemService.getAllMenuItems(filters, paginationOptions);

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

  sendResponse<MenuItem[]>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Menu items retrieved successfully',
    meta: paginationMeta,
    data: result.data,
  });
});

const getSingleMenuItem = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await MenuItemService.getSingleMenuItem(id);
  sendResponse<MenuItem>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Menu item retrieved successfully',
    data: result,
  });
});

const updateMenuItem = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = req.body;
  const result = await MenuItemService.updateMenuItem(id, data);
  sendResponse<MenuItem>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Menu item updated successfully',
    data: result,
  });
});

const deleteMenuItem = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  await MenuItemService.deleteMenuItem(id);
  sendResponse<MenuItem>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Menu item deleted successfully',
    data: null,
  });
});

const reorderMenuItems = catchAsync(async (req: Request, res: Response) => {
  const reorderData = req.body;
  const result = await MenuItemService.reorderMenuItems(reorderData);
  sendResponse<MenuItem[]>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Menu items reordered successfully',
    data: result,
  });
});

const bulkCreateMenuItems = catchAsync(async (req: Request, res: Response) => {
  const menuItems = req.body;
  const result = await MenuItemService.bulkCreateMenuItems(menuItems);
  sendResponse<MenuItem[]>(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: `${result.length} menu items created successfully`,
    data: result,
  });
});

const deleteAllMenuItems = catchAsync(async (req: Request, res: Response) => {
  const result = await MenuItemService.deleteAllMenuItems();
  sendResponse<{ deletedCount: number }>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `All menu items deleted successfully`,
    data: result,
  });
});

export const MenuItemController = {
  createMenuItem,
  getAllMenuItems,
  getSingleMenuItem,
  updateMenuItem,
  deleteMenuItem,
  reorderMenuItems,
  bulkCreateMenuItems,
  deleteAllMenuItems
};