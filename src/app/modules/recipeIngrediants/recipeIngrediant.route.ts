import express from 'express';
import { RecipeIngrediantController } from './recipeIngrediant.controller';
import { RecipeIngrediantValidation } from './recipeIngrediant.validation';
import validateRequest from '../../middlewares/validateRequest';

const router = express.Router();

router.post(
  '/',
  validateRequest(RecipeIngrediantValidation.createRecipeIngrediantZodSchema),
  RecipeIngrediantController.createRecipeIngrediant
);

// GET /recipe-ingredients supports pagination: ?page=1&limit=10
router.get('/', RecipeIngrediantController.getAllRecipeIngrediants);
router.get('/recipe/:recipeId', RecipeIngrediantController.getRecipeIngrediantsByRecipeId);
router.get('/:id', RecipeIngrediantController.getSingleRecipeIngrediant);

router.patch(
  '/:id',
  validateRequest(RecipeIngrediantValidation.updateRecipeIngrediantZodSchema),
  RecipeIngrediantController.updateRecipeIngrediant
);

router.delete('/:id', RecipeIngrediantController.deleteRecipeIngrediant);

export const RecipeIngrediantRoute = router;
