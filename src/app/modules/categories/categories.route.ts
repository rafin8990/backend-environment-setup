import express from 'express';
import validateRequest from '../../middlewares/validateRequest';
import { CategoryValidation } from './categories.validation';
import { CategoryController } from './categories.controller';

const router = express.Router();

router.post(
  '/',
  validateRequest(CategoryValidation.createCategoryZodSchema),
  CategoryController.createCategory
);

router.get('/', CategoryController.getAllCategories);

router.get('/:id', CategoryController.getSingleCategory);

router.patch(
  '/:id',
  validateRequest(CategoryValidation.updateCategoryZodSchema),
  CategoryController.updateCategory
);

router.delete('/:id', CategoryController.deleteCategory);

export const CategoryRoutes = router;
