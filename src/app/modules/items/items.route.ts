import express from 'express';
import { ItemController } from './items.controller';
import { ItemValidation } from './items.validation';
import validateRequest from '../../middlewares/validateRequest';

const router = express.Router();

router.post(
  '/',
  // validateRequest(ItemValidation.createItemZodSchema), // Temporarily disabled
  ItemController.createItem
);

router.get('/', ItemController.getAllItems);

router.get('/:id', ItemController.getSingleItem);

router.patch(
  '/:id',
  // validateRequest(ItemValidation.updateItemZodSchema), // Temporarily disabled
  ItemController.updateItem
);

router.delete('/:id', ItemController.deleteItem);

export const ItemRoute = router;
