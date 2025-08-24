import express from 'express';
import validateRequest from '../../middlewares/validateRequest';
import { MenuItemController } from './menuItems.controller';
import { MenuItemValidation } from './menuItems.validation';

const router = express.Router();

router.post(
  '/',
  validateRequest(MenuItemValidation.createMenuItemZodSchema),
  MenuItemController.createMenuItem
);

router.post(
  '/bulk',
  validateRequest(MenuItemValidation.bulkCreateMenuItemsZodSchema),
  MenuItemController.bulkCreateMenuItems
);

router.post(
  '/reorder',
  validateRequest(MenuItemValidation.reorderMenuItemsZodSchema),
  MenuItemController.reorderMenuItems
);

router.delete('/all', MenuItemController.deleteAllMenuItems);

// Parameterized routes must come after specific routes
router.get('/', MenuItemController.getAllMenuItems);
router.get('/:id', MenuItemController.getSingleMenuItem);
router.patch('/:id', MenuItemController.updateMenuItem);
router.delete('/:id', MenuItemController.deleteMenuItem);

export const MenuItemsRoute = router;
