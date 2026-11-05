import { Router } from 'express';
import {
  listSessions,
  getSession,
  getActiveSession,
  startSession,
  completeSession,
  abandonSession,
} from './sessions.controller.js';

export const sessionsRouter = Router();

sessionsRouter.get('/', listSessions);
sessionsRouter.get('/active', getActiveSession);
sessionsRouter.get('/:id', getSession);
sessionsRouter.post('/', startSession);
sessionsRouter.post('/:id/complete', completeSession);
sessionsRouter.post('/:id/abandon', abandonSession);

export default sessionsRouter;
