import { Router } from 'express';
import {
  listTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  reorderTasks,
} from './tasks.controller.js';
import subtasksRouter from '../subtasks/subtasks.routes.js';

export const tasksRouter = Router();

// Subtasks nested router
tasksRouter.use('/:taskId/subtasks', subtasksRouter);

tasksRouter.get('/', listTasks);
tasksRouter.patch('/reorder', reorderTasks);
tasksRouter.get('/:id', getTask);
tasksRouter.post('/', createTask);
tasksRouter.patch('/:id', updateTask);
tasksRouter.delete('/:id', deleteTask);

export default tasksRouter;
