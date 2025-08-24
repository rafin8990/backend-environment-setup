import express from 'express';
import validateRequest from '../../middlewares/validateRequest';
import { UserValidation } from './users.validation';
import { UserController } from './users.controller';

const router = express.Router();

// 🔹 Create User
router.post(
  '/',
  validateRequest(UserValidation.createUserZodSchema),
  UserController.createUser
);

// 🔹 Get All Users
router.get('/', UserController.getAllUsers);

// 🔹 Get Single User
router.get('/:id', UserController.getSingleUser);

// 🔹 Update User
router.patch(
  '/:id',
  validateRequest(UserValidation.updateUserZodSchema),
  UserController.updateUser
);

// 🔹 Delete User
router.delete('/:id', UserController.deleteUser);

export const UserRoutes = router;
