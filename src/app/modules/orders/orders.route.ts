import express from 'express';
import { OrderController } from './orders.controller';
import { OrderValidation } from './orders.validation';
import validateRequest from '../../middlewares/validateRequest';

const router = express.Router();

router.post(
  '/',
  validateRequest(OrderValidation.createOrderZodSchema),
  OrderController.createOrder
);
router.get('/', OrderController.getAllOrders);
router.get('/:id', OrderController.getSingleOrder);
router.patch(
  '/:id',
  validateRequest(OrderValidation.updateOrderZodSchema),
  OrderController.updateOrder
);
router.delete('/:id', OrderController.removeOrder);

export const OrdersRoute = router;