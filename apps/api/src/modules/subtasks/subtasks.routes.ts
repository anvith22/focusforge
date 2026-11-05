import { Router } from 'express';
import {
  listSubtasks,
  createSubtask,
  updateSubtask,
  deleteSubtask,
  reorderSubtasks,
} from './subtasks.controller.js';

const router = Router({ mergeParams: true });

router.get('/', listSubtasks);
router.post('/', createSubtask);
router.patch('/reorder', reorderSubtasks);
router.patch('/:subtaskId', updateSubtask);
router.delete('/:subtaskId', deleteSubtask);

export default router;

