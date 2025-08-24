import express from 'express';
import { SupplierController } from './suppliers.controller';
import { SupplierValidation } from './suppliers.validation';
import validateRequest from '../../middlewares/validateRequest';

const router = express.Router();

router.post(
  '/',
  validateRequest(SupplierValidation.createSupplierZodSchema),
  SupplierController.createSupplier
);
router.get('/', SupplierController.getAllSuppliers);
router.get('/:id', SupplierController.getSingleSupplier);
router.patch('/:id', SupplierController.updateSupplier);
router.delete('/:id', SupplierController.deleteSupplier);

export const SuppliersRoute = router;