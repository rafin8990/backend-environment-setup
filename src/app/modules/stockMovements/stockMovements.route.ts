import express from 'express';
import { StockMovementController } from './stockMovements.controller';

const router = express.Router();

// Record new stock movement
router.post('/', StockMovementController.recordStockMovement);

// Get stock movement history with filters
router.get('/', StockMovementController.getStockMovementHistory);

// Get stock movements by item
router.get('/item/:itemId', StockMovementController.getStockMovementsByItem);

// Get stock movements by location
router.get('/location/:locationId', StockMovementController.getStockMovementsByLocation);

// Get stock movements by reference (e.g., purchase_entry, order, stock_transfer)
router.get('/reference/:referenceType/:referenceId', StockMovementController.getStockMovementsByReference);

// Get stock movement summary
router.get('/summary', StockMovementController.getStockMovementSummary);

export const StockMovementRoute = router;
