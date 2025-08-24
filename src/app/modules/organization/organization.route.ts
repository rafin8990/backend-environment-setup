import express from 'express';
import validateRequest from '../../middlewares/validateRequest';
import { OrganizationValidation } from './organization.validation';
import { OrganizationController } from './organization.controller';

const router = express.Router();

// 🔹 Create Organization
router.post(
  '/',
  validateRequest(OrganizationValidation.createOrganizationZodSchema),
  OrganizationController.createOrganization
);

// 🔹 Get All Organizations
router.get('/', OrganizationController.getAllOrganizations);

// 🔹 Get Single Organization
router.get('/:id', OrganizationController.getSingleOrganization);

// 🔹 Update Organization
router.patch(
  '/:id',
  validateRequest(OrganizationValidation.updateOrganizationZodSchema),
  OrganizationController.updateOrganization
);

// 🔹 Delete Organization
router.delete('/:id', OrganizationController.deleteOrganization);



export const OrganizationsRoutes = router;
