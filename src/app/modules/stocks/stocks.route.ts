import express from 'express';
import { StockValidation } from './stock.validation';
import validateRequest from '../../middlewares/validateRequest';
import { StockController } from './stocks.controller';

const router = express.Router();

router.post(
  '/',
  validateRequest(StockValidation.createStockZodSchema),
  StockController.createStock
);

router.get('/', StockController.getAllStocks);

router.get('/:id', StockController.getSingleStock);

// Item-specific stock routes
router.get('/item/:itemId', StockController.getStocksByItem);
router.get('/item/:itemId/latest', StockController.getLatestStockByItem);

// Location-specific stock routes
router.get('/location/:locationId', StockController.getStocksByLocation);

router.patch(
  '/:id',
  validateRequest(StockValidation.updateStockZodSchema),
  StockController.updateStock
);

router.delete('/:id', StockController.deleteStock);

// Bulk operations
router.post(
  '/bulk/create',
  validateRequest(StockValidation.bulkCreateStockZodSchema),
  StockController.bulkCreateStocks
);

router.patch(
  '/bulk/update',
  validateRequest(StockValidation.bulkUpdateStockZodSchema),
  StockController.bulkUpdateStocks
);

export const StockRoute = router;
