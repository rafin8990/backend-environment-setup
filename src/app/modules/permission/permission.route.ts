import express from 'express';
import validateRequest from '../../middlewares/validateRequest';
import { PermissionValidation } from './permission.validation';
import { PermissionController } from './permission.controller';

const router = express.Router();

router.post(
  '/',
  validateRequest(PermissionValidation.createPermissionZodSchema),
  PermissionController.createPermission
);

router.get('/', PermissionController.getAllPermissions);

router.get('/:id', PermissionController.getSinglePermission);

router.patch(
  '/:id',
  validateRequest(PermissionValidation.updatePermissionZodSchema),
  PermissionController.updatePermission
);

router.delete('/:id', PermissionController.deletePermission);

export const PermissionRoutes = router;
