import express from 'express';
import { TypeController } from './type.controller';
import { TypeValidation } from './type.validation';
import validateRequest from '../../middlewares/validateRequest';

const router = express.Router();

router.post(
  '/',
  validateRequest(TypeValidation.createTypeZodSchema),
  TypeController.createType
);

router.get('/', TypeController.getAllTypes);
router.get('/:id', TypeController.getSingleType);

router.patch(
  '/:id',
  validateRequest(TypeValidation.updateTypeZodSchema),
  TypeController.updateType
);

router.delete('/:id', TypeController.deleteType);

export const TypeRoute = router;
