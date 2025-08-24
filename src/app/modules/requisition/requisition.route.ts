import express from 'express';
import { RequisitionController } from './requisition.controller';
import { RequisitionValidation } from './requisition.validation';
import validateRequest from '../../middlewares/validateRequest';

const router = express.Router();

router.post(
  '/',
  validateRequest(RequisitionValidation.createRequisitionZodSchema),
  RequisitionController.createRequisition
);

router.get('/', RequisitionController.getAllRequisitions);

router.get('/pending', RequisitionController.getPendingRequisitionsAnalysis);

router.get('/stats/date-range', RequisitionController.getRequisitionStatsByDateRange);

router.get('/item/:itemId', RequisitionController.getRequisitionsByItemId);

router.get('/destination-location/:locationId', RequisitionController.getRequisitionsByDestinationLocation);

router.get('/status/:status', RequisitionController.getRequisitionsByStatus);

router.get('/date-range', RequisitionController.getRequisitionsByDateRange);

router.get('/user/:userId', RequisitionController.getRequisitionsByUser);

router.patch('/:id/approve', RequisitionController.approveRequisition);

router.patch('/:id/receive', validateRequest(RequisitionValidation.markRequisitionAsReceivedZodSchema), RequisitionController.markRequisitionAsReceived);

router.get('/:id', RequisitionController.getSingleRequisition);

router.patch(
  '/:id',
  validateRequest(RequisitionValidation.updateRequisitionZodSchema),
  RequisitionController.updateRequisition
);

router.delete('/:id', RequisitionController.deleteRequisition);

export const RequisitionRoute = router;
