import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import { TagService } from "./tags.service";
import sendResponse from "../../../shared/sendResponse";
import httpStatus from "http-status";
import pick from "../../../shared/pick";
import { paginationFields } from "../../../constants/pagination";
import { ITag } from "./tags.interface";

const createTag = catchAsync(async (req: Request, res: Response) => {
  const data = req.body;
  const result = await TagService.createTag(data);
  sendResponse<ITag>(res, {
    statusCode: httpStatus.CREATED,
    message: 'Tag created successfully',
    success: true,
    data: result,
  });
});

const getAllTags = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, ['searchTerm', 'name']);
  const paginationOptions = pick(req.query, paginationFields);

  const result = await TagService.getAllTags(filters, paginationOptions);

  sendResponse<ITag[]>(res, {
    statusCode: httpStatus.OK,
    message: 'Tags retrieved successfully',
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

const getSingleTag = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await TagService.getSingleTag(Number(id));
  sendResponse<ITag>(res, {
    statusCode: httpStatus.OK,
    message: 'Tag retrieved successfully',
    success: true,
    data: result,
  });
});

const updateTag = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await TagService.updateTag(Number(id), req.body);
  sendResponse<ITag>(res, {
    statusCode: httpStatus.OK,
    message: 'Tag updated successfully',
    success: true,
    data: result,
  });
});

const deleteTag = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  await TagService.deleteTag(Number(id));
  sendResponse<null>(res, {
    statusCode: httpStatus.OK,
    message: 'Tag deleted successfully',
    success: true,
    data: null,
  });
});

export const TagController = {
  createTag,
  getAllTags,
  getSingleTag,
  updateTag,
  deleteTag,
};