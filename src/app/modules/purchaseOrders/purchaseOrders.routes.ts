import express from 'express';
import validateRequest from '../../middlewares/validateRequest';
import { PurchaseOrderController } from './purchaseOrders.controller';
import { PurchaseOrderValidation } from './purchaseOrders.validation';

const router = express.Router();

// Create purchase order
router.post(
  '/',
  validateRequest(PurchaseOrderValidation.createPurchaseOrderZodSchema),
  PurchaseOrderController.createPurchaseOrder
);

// Get all purchase orders
router.get(
  '/',
  PurchaseOrderController.getAllPurchaseOrders
);

// Get single purchase order
router.get(
  '/:id',
  PurchaseOrderController.getSinglePurchaseOrder
);

// Update purchase order
router.patch(
  '/:id',
  validateRequest(PurchaseOrderValidation.updatePurchaseOrderZodSchema),
  PurchaseOrderController.updatePurchaseOrder
);

// Update purchase order status
router.patch(
  '/:id/status',
  validateRequest(PurchaseOrderValidation.updatePurchaseOrderStatusZodSchema),
  PurchaseOrderController.updatePurchaseOrderStatus
);

// Delete purchase order
router.delete(
  '/:id',
  PurchaseOrderController.deletePurchaseOrder
);

// New routes for requisition-based PO creation
router.post(
  '/from-requisition',
  PurchaseOrderController.createPOFromRequisition
);

// Create consolidated PO from multiple requisitions
router.post(
  '/consolidated',
  PurchaseOrderController.createConsolidatedPO
);

// Get POs by requisition
router.get(
  '/by-requisition/:requisitionId',
  PurchaseOrderController.getPOsByRequisition
);

// Get POs by supplier
router.get(
  '/by-supplier/:supplierId',
  PurchaseOrderController.getPOsBySupplier
);

export default router;
