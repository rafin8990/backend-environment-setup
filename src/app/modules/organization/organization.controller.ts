import { Request, Response } from 'express';
import catchAsync from '../../../shared/catchAsync';
import { OrganizationService } from './organization.service';
import sendResponse from '../../../shared/sendResponse';
import { IOrganization } from './organization.interface';
import httpStatus from 'http-status';
import pick from '../../../shared/pick';

const createOrganization = catchAsync(async (req: Request, res: Response) => {
  const data = req.body;
  const result = await OrganizationService.createOrganization(data);
  sendResponse<IOrganization>(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Organization created successfully',
    data: result,
  });
});

// Get All Organizations
const getAllOrganizations = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, ['searchTerm', 'name', 'domain']);
  const result = await OrganizationService.getAllOrganizations(filters);
  sendResponse<IOrganization[]>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Organizations retrieved successfully',
    data: result,
  });
});

// Get Single Organization
const getSingleOrganization = catchAsync(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await OrganizationService.getSingleOrganization(Number(id));
    sendResponse<IOrganization>(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Organization retrieved successfully',
      data: result,
    });
  }
);

// Update Organization
const updateOrganization = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = req.body;
  const result = await OrganizationService.updateOrganization(Number(id), data);
  sendResponse<IOrganization>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Organization updated successfully',
    data: result,
  });
});

// Delete Organization
const deleteOrganization = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  await OrganizationService.deleteOrganization(Number(id));
  sendResponse<IOrganization>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Organization deleted successfully',
    data: null,
  });
});

export const OrganizationController = {
  createOrganization,
  getAllOrganizations,
  getSingleOrganization,
  updateOrganization,
  deleteOrganization,
};
