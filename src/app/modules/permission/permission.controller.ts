import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { IPermission } from './permission.interface';
import { PermissionService } from './permission.service';
import pick from '../../../shared/pick';

// Create Permission
const createPermission = catchAsync(async (req: Request, res: Response) => {
  const data = req.body;
  const result = await PermissionService.createPermission(data);
  sendResponse<IPermission>(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Permission created successfully',
    data: result,
  });
});

// Get All Permissions
const getAllPermissions = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, ['searchTerm', 'title']);
  const result = await PermissionService.getAllPermissions(filters);
  sendResponse<IPermission[]>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Permissions retrieved successfully',
    data: result,
  });
});

// Get Single Permission
const getSinglePermission = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await PermissionService.getSinglePermission(Number(id));
  sendResponse<IPermission>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Permission retrieved successfully',
    data: result,
  });
});

// Update Permission
const updatePermission = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = req.body;
  const result = await PermissionService.updatePermission(Number(id), data);
  sendResponse<IPermission>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Permission updated successfully',
    data: result,
  });
});

// Delete Permission
const deletePermission = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  await PermissionService.deletePermission(Number(id));
  sendResponse<null>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Permission deleted successfully',
    data: null,
  });
});

export const PermissionController = {
  createPermission,
  getAllPermissions,
  getSinglePermission,
  updatePermission,
  deletePermission,
};
