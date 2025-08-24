import express from 'express';
import StockTransferController from './stockTransfers.controller';

const router = express.Router();

// Create stock transfer
router.post(
  '/',
  StockTransferController.createStockTransfer
);

// Get all stock transfers
router.get(
  '/',
  StockTransferController.getAllStockTransfers
);

// Get stock transfer by ID
router.get(
  '/:id',
  StockTransferController.getStockTransferById
);

// Update stock transfer
router.patch(
  '/:id',
  StockTransferController.updateStockTransfer
);

// Delete stock transfer
router.delete(
  '/:id',
  StockTransferController.deleteStockTransfer
);

// New endpoints for independent workflow
router.post(
  '/independent',
  StockTransferController.createIndependentStockTransfer
);

// Create GRN-based stock transfer
router.post(
  '/grn-based',
  StockTransferController.createGRNBasedStockTransfer
);

// Create purchase entry-based stock transfer
router.post(
  '/pe-based',
  StockTransferController.createPEBasedStockTransfer
);

// New route for requisition-based stock transfer
router.post(
  '/from-requisition',
  StockTransferController.createStockTransferFromRequisition
);

// Get stock transfers by GRN
router.get(
  '/by-grn/:grnId',
  StockTransferController.getStockTransfersByGRN
);

// Get stock transfers by purchase entry
router.get(
  '/by-pe/:purchaseEntryId',
  StockTransferController.getStockTransfersByPurchaseEntry
);

// Legacy endpoints for backward compatibility
router.get(
  '/by-po/:purchaseOrderId',
  StockTransferController.getStockTransfersByPurchaseOrder
);

router.get(
  '/by-requisition/:requisitionId',
  StockTransferController.getStockTransfersByRequisition
);

// Approve stock transfer
router.patch(
  '/:id/approve',
  StockTransferController.approveStockTransfer
);

// Dispatch stock transfer
router.patch(
  '/:id/dispatch',
  StockTransferController.dispatchStockTransfer
);

// Receive stock transfer
router.patch(
  '/:id/receive',
  StockTransferController.receiveStockTransfer
);

export default router;
