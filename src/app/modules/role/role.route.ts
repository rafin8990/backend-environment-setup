import express from 'express';
import { RoleController } from './role.controller';
import validateRequest from '../../middlewares/validateRequest';
import { RoleValidation } from './role.validation';

const router = express.Router();

// 🔹 Create Role
router.post(
  '/',
  validateRequest(RoleValidation.createRoleZodSchema),
  RoleController.createRole
);

// 🔹 Get All Roles
router.get('/', RoleController.getAllRoles);

// 🔹 Get Single Role
router.get('/:id', RoleController.getSingleRole);

// 🔹 Update Role
router.patch(
  '/:id',
  validateRequest(RoleValidation.updateRoleZodSchema),
  RoleController.updateRole
);

// 🔹 Delete Role
router.delete('/:id', RoleController.deleteRole);

export const RoleRoutes = router;
