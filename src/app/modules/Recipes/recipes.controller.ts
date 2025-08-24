import { Request, Response } from 'express';
import catchAsync from '../../../shared/catchAsync';
import { RecipeService } from './recipes.service';
import sendResponse from '../../../shared/sendResponse';
import httpStatus from 'http-status';
import pick from '../../../shared/pick';
import { paginationFields } from '../../../constants/pagination';
import { paginationHelpers } from '../../../helpers/paginationHelper';

const createRecipe = catchAsync(async (req: Request, res: Response) => {
  const result = await RecipeService.createRecipe(req.body);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Recipe created successfully!',
    data: result,
  });
});

const getAllRecipes = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, [
    'search',
    'searchTerm',
    'category_id',
    'tag_id',
    'recipe_code',
    'estimated_time',
    'price',
  ]);
  const paginationOptions = pick(req.query, paginationFields);

  // Handle multiple tag_id parameters
  let tagIds: number[] = [];
  if (req.query.tag_id) {
    if (Array.isArray(req.query.tag_id)) {
      tagIds = req.query.tag_id.map(id => Number(id));
    } else {
      tagIds = [Number(req.query.tag_id)];
    }
  }

  const result = await RecipeService.getAllRecipes({ ...filters, tag_ids: tagIds }, paginationOptions);

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
    message: 'Recipes retrieved successfully!',
    meta: paginationMeta,
    data: result.data,
  });
});

const getSingleRecipe = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const result = await RecipeService.getSingleRecipe(id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Recipe retrieved successfully!',
    data: result,
  });
});

const updateRecipe = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const result = await RecipeService.updateRecipe(id, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Recipe updated successfully!',
    data: result,
  });
});

const deleteRecipe = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  await RecipeService.deleteRecipe(id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Recipe deleted successfully!',
  });
});

export const RecipeController = {
  createRecipe,
  getAllRecipes,
  getSingleRecipe,
  updateRecipe,
  deleteRecipe,
};
