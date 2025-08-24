import express from 'express';
import validateRequest from '../../middlewares/validateRequest';
import { PurchaseEntryController } from './purchaseEntries.controller';
import { PurchaseEntryValidation } from './purchaseEntries.validation';

const router = express.Router();

router.post(
  '/',
  validateRequest(PurchaseEntryValidation.createPurchaseEntryZodSchema),
  PurchaseEntryController.createPurchaseEntry
);

// New route for GRN-based PE creation
router.post(
  '/from-grn',
  validateRequest(PurchaseEntryValidation.createPEFromGRNZodSchema),
  PurchaseEntryController.createPEFromGRN
);

// New route for PO-based PE creation (bypass GRN)
router.post(
  '/from-po',
  validateRequest(PurchaseEntryValidation.createPEFromPOZodSchema),
  PurchaseEntryController.createPEFromPO
);

router.get('/', PurchaseEntryController.getAllPurchaseEntries);

router.get('/:id', PurchaseEntryController.getSinglePurchaseEntry);

router.patch(
  '/:id',
  validateRequest(PurchaseEntryValidation.updatePurchaseEntryZodSchema),
  PurchaseEntryController.updatePurchaseEntry
);

router.patch(
  '/:id/payment-status',
  validateRequest(PurchaseEntryValidation.updatePaymentStatusZodSchema),
  PurchaseEntryController.updatePaymentStatus
);

router.delete('/:id', PurchaseEntryController.deletePurchaseEntry);

export const PurchaseEntryRoutes = router;
