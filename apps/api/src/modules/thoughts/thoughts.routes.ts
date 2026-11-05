import { Router } from 'express';
import {
  listThoughts,
  createThought,
  updateThought,
  deleteThought,
  convertThoughtToTask,
} from './thoughts.controller.js';

const router = Router();

router.get('/', listThoughts);
router.post('/', createThought);
router.patch('/:id', updateThought);
router.delete('/:id', deleteThought);
router.post('/:id/convert-to-task', convertThoughtToTask);

export default router;

