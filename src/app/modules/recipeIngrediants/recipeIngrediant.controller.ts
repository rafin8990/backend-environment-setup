import { Request, Response } from 'express';
import catchAsync from '../../../shared/catchAsync';
import { RecipeIngrediantService } from './recipeIngrediant.service';
import sendResponse from '../../../shared/sendResponse';
import httpStatus from 'http-status';
import pick from '../../../shared/pick';
import { paginationFields } from '../../../constants/pagination';

const createRecipeIngrediant = catchAsync(async (req: Request, res: Response) => {
  const result = await RecipeIngrediantService.createRecipeIngrediant(req.body);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Recipe ingredient created successfully!',
    data: result,
  });
});

const getAllRecipeIngrediants = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, ['searchTerm', 'recipe_id', 'item_id']);
  const paginationOptions = pick(req.query, paginationFields);

  const result = await RecipeIngrediantService.getAllRecipeIngrediants(filters, paginationOptions);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Recipe ingredients retrieved successfully!',
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

const getRecipeIngrediantsByRecipeId = catchAsync(async (req: Request, res: Response) => {
  const recipeId = Number(req.params.recipeId);
  const result = await RecipeIngrediantService.getRecipeIngrediantsByRecipeId(recipeId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Recipe ingredients retrieved successfully!',
    data: result,
  });
});

const getSingleRecipeIngrediant = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const result = await RecipeIngrediantService.getSingleRecipeIngrediant(id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Recipe ingredient retrieved successfully!',
    data: result,
  });
});

const updateRecipeIngrediant = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!req.body || Object.keys(req.body).length === 0) {
    throw new (await import('../../../errors/ApiError')).default(
      (await import('http-status')).default.BAD_REQUEST,
      'No data provided for update'
    );
  }
  const result = await RecipeIngrediantService.updateRecipeIngrediant(id, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Recipe ingredient updated successfully!',
    data: result,
  });
});

const deleteRecipeIngrediant = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  await RecipeIngrediantService.deleteRecipeIngrediant(id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Recipe ingredient deleted successfully!',
  });
});

export const RecipeIngrediantController = {
  createRecipeIngrediant,
  getAllRecipeIngrediants,
  getRecipeIngrediantsByRecipeId,
  getSingleRecipeIngrediant,
  updateRecipeIngrediant,
  deleteRecipeIngrediant,
};
