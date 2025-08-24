import catchAsync from "../../../shared/catchAsync";
import { Request, Response } from 'express';
import { IStorageLocation } from "./location.interface";
import { LocationService } from "./location.service";
import sendResponse from "../../../shared/sendResponse";
import httpStatus from "http-status";
import pick from "../../../shared/pick";
import { paginationFields } from "../../../constants/pagination";
import { paginationHelpers } from "../../../helpers/paginationHelper";

const createLocation = catchAsync(async (req: Request, res: Response) => {
  const locationData = req.body as IStorageLocation;

  const result = await LocationService.createLocation(locationData);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Location created successfully!',
    data: result,
  });
});

const getAllLocations = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, ['searchTerm', 'name', 'type', 'temperature_controlled']);
  const paginationOptions = pick(req.query, paginationFields);

  const result = await LocationService.getAllLocations(
    filters,
    paginationOptions
  );

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
    message: 'Locations retrieved successfully!',
    meta: paginationMeta,
    data: result.data,
  });
});

const getSingleLocation = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const result = await LocationService.getSingleLocation(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Location retrieved successfully!',
    data: result,
  });
});

const updateLocation = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const updateData = req.body;

  const result = await LocationService.updateLocation(id, updateData);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Location updated successfully!',
    data: result,
  });
});

const deleteLocation = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  await LocationService.deleteLocation(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Location deleted successfully!',
  });
});

export const LocationController = {
  createLocation,
  getAllLocations,
  getSingleLocation,
  updateLocation,
  deleteLocation,
};