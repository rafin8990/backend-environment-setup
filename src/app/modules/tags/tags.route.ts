import express from 'express';

import validateRequest from '../../middlewares/validateRequest';
import { TagValidation } from './tags.validation';
import { TagController } from './tags.controller';

const router = express.Router();

router.post(
  '/',
  validateRequest(TagValidation.createTagZodSchema),
  TagController.createTag
);

router.get('/', TagController.getAllTags);
router.get('/:id', TagController.getSingleTag);

router.patch(
  '/:id',
  validateRequest(TagValidation.updateTagZodSchema),
  TagController.updateTag
);

router.delete('/:id', TagController.deleteTag);

export const TagRoutes = router;
