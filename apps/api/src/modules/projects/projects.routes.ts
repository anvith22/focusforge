import { Router } from 'express';
import {
  listProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
} from './projects.controller.js';

export const projectsRouter = Router();

projectsRouter.get('/', listProjects);
projectsRouter.get('/:id', getProject);
projectsRouter.post('/', createProject);
projectsRouter.patch('/:id', updateProject);
projectsRouter.delete('/:id', deleteProject);

export default projectsRouter;
