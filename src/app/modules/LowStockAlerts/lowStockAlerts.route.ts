import express from 'express';
import { LowStockAlertController } from './lowStockAlerts.controller';
import { LowStockAlertValidation } from './lowStockAlerts.validation';
import validateRequest from '../../middlewares/validateRequest';

const router = express.Router();

router.post(
  '/',
  validateRequest(LowStockAlertValidation.createLowStockAlertZodSchema),
  LowStockAlertController.createLowStockAlert
);
router.get('/', LowStockAlertController.getAllLowStockAlerts);
router.get('/:id', LowStockAlertController.getSingleLowStockAlert);
router.patch(
  '/:id',
  validateRequest(LowStockAlertValidation.updateLowStockAlertZodSchema),
  LowStockAlertController.updateLowStockAlert
);
router.delete('/:id', LowStockAlertController.deleteLowStockAlert);
router.delete('/', LowStockAlertController.deleteAllLowStockAlerts);

export const LowStockAlertsRoute = router;