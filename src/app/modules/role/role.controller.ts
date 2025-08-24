import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { IRole } from './role.interface';
import { RoleService } from './role.service';

// Create Role
const createRole = catchAsync(async (req: Request, res: Response) => {
  const data = req.body;
  const result = await RoleService.createRole(data);
  sendResponse<IRole>(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Role created successfully',
    data: result,
  });
});

// Get All Roles
const getAllRoles = catchAsync(async (_req: Request, res: Response) => {
  const result = await RoleService.getAllRoles();
  sendResponse<IRole[]>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Roles retrieved successfully',
    data: result,
  });
});

// Get Single Role
const getSingleRole = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await RoleService.getSingleRole(Number(id));
  sendResponse<IRole>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Role retrieved successfully',
    data: result,
  });
});

// Update Role
const updateRole = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = req.body;
  const result = await RoleService.updateRole(Number(id), data);
  sendResponse<IRole>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Role updated successfully',
    data: result,
  });
});

// Delete Role
const deleteRole = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  await RoleService.deleteRole(Number(id));
  sendResponse<null>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Role deleted successfully',
    data: null,
  });
});

export const RoleController = {
  createRole,
  getAllRoles,
  getSingleRole,
  updateRole,
  deleteRole,
};
