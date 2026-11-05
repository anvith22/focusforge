import { Router } from 'express';
import { getTodayDashboard, getWeeklyDashboard } from './dashboard.controller.js';

export const dashboardRouter = Router();

dashboardRouter.get('/today', getTodayDashboard);
dashboardRouter.get('/weekly', getWeeklyDashboard);

export default dashboardRouter;
