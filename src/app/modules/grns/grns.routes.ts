import express from 'express';
import validateRequest from '../../middlewares/validateRequest';
import { GRNController } from './grns.controller';
import { GRNValidation } from './grns.validation';

const router = express.Router();

router.post(
  '/',
  validateRequest(GRNValidation.createGRNZodSchema),
  GRNController.createGRN
);

// New route for PO-based GRN creation
router.post(
  '/from-po',
  validateRequest(GRNValidation.createGRNFromPOZodSchema),
  GRNController.createGRNFromPO
);

router.get('/', GRNController.getAllGRNs);

router.get('/:id', GRNController.getSingleGRN);

router.patch(
  '/:id',
  validateRequest(GRNValidation.updateGRNZodSchema),
  GRNController.updateGRN
);

router.patch(
  '/:id/status',
  validateRequest(GRNValidation.updateGRNStatusZodSchema),
  GRNController.updateGRNStatus
);

router.delete('/:id', GRNController.deleteGRN);

export const GRNRoutes = router;
