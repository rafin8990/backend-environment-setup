import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import { TypeService } from "./type.service";
import sendResponse from "../../../shared/sendResponse";
import { IType } from "./type.interface";
import httpStatus from "http-status";
import { IPaginationOptions } from "../../../interfaces/pagination";
import pick from "../../../shared/pick";
import { TypeFilterableFields } from "./type.constant";
import { paginationFields } from "../../../constants/pagination";

// Create a Type
const createType = catchAsync(async (req: Request, res: Response) => {
  const result = await TypeService.createType(req.body);

  sendResponse<IType>(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Type created successfully',
    data: result,
  });
});

// Get All Types with Pagination & Filtering
const getAllTypes = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, TypeFilterableFields);
  const paginationOptions = pick(req.query, paginationFields);

  const result = await TypeService.getAllTypes(filters, paginationOptions);

  sendResponse<IType[]>(res, {
    statusCode: httpStatus.OK,
    message: 'Types retrieved successfully',
    success: true,
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

// Get Single Type
const getSingleType = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const result = await TypeService.getSingleType(id);

  sendResponse<IType>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Type retrieved successfully',
    data: result,
  });
});

// Update Type
const updateType = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const result = await TypeService.updateType(id, req.body);

  sendResponse<IType>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Type updated successfully',
    data: result,
  });
});

// Delete Type
const deleteType = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  await TypeService.deleteType(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Type deleted successfully',
  });
});

export const TypeController = {
  createType,
  getAllTypes,
  getSingleType,
  updateType,
  deleteType,
};