import { Router } from 'express';
import { breakDownTask } from './ai.controller.js';

const router = Router();

router.post('/tasks/:taskId/breakdown', breakDownTask);

export default router;

