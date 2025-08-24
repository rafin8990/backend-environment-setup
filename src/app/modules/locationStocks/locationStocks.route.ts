import express from 'express';
import { LocationStockValidation } from './locationStocks.validation';
import validateRequest from '../../middlewares/validateRequest';
import { LocationStockController } from './locationStocks.controller';

const router = express.Router();

// Create new location stock record
router.post(
  '/',
  validateRequest(LocationStockValidation.createLocationStockZodSchema),
  LocationStockController.createLocationStock
);

// Get all location stocks with filters
router.get('/', LocationStockController.getAllLocationStocks);

// Get location stocks by specific location
router.get('/location/:locationId', LocationStockController.getLocationStocksByLocation);

// Get specific location stock record
router.get('/:locationId/:itemId', LocationStockController.getLocationStock);

// Update location stock record
router.patch(
  '/:locationId/:itemId',
  validateRequest(LocationStockValidation.updateLocationStockZodSchema),
  LocationStockController.updateLocationStock
);

// Update location stock quantity (add/subtract/set)
router.patch(
  '/:locationId/:itemId/quantity',
  LocationStockController.updateLocationStockQuantity
);

// Bulk update location stocks
router.patch(
  '/bulk/update',
  validateRequest(LocationStockValidation.bulkUpdateLocationStocksZodSchema),
  LocationStockController.bulkUpdateLocationStocks
);

// Check stock availability for multiple items
router.post(
  '/:locationId/check-availability',
  LocationStockController.checkStockAvailability
);

export const LocationStockRoute = router;
