import express from 'express';
import { RecipeController } from './recipes.controller';
import { RecipeValidation } from './recipes.validation';
import validateRequest from '../../middlewares/validateRequest';

const router = express.Router();

router.post(
  '/',
  validateRequest(RecipeValidation.createRecipeZodSchema),
  RecipeController.createRecipe
);

router.get('/', RecipeController.getAllRecipes);
router.get('/:id', RecipeController.getSingleRecipe);

router.patch(
  '/:id',
  validateRequest(RecipeValidation.updateRecipeZodSchema),
  RecipeController.updateRecipe
);

router.delete('/:id', RecipeController.deleteRecipe);

export const RecipeRoute = router;
