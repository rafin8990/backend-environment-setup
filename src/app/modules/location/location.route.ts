import express from 'express';
import { LocationController } from './location.controller';
import { LocationValidation } from './location.validation';
import validateRequest from '../../middlewares/validateRequest';

const router = express.Router();

router.post(
  '/',
  validateRequest(LocationValidation.createLocationZodSchema),
  LocationController.createLocation
);

router.get('/', LocationController.getAllLocations);

router.get('/:id', LocationController.getSingleLocation);

router.patch(
  '/:id',
  validateRequest(LocationValidation.updateLocationZodSchema),
  LocationController.updateLocation
);

router.delete('/:id', LocationController.deleteLocation);

export const LocationRoute = router;
