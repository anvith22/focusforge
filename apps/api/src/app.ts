import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { pool } from './db/pool.js';
import errorHandler from './middleware/errorHandler.js';
import projectsRouter from './modules/projects/projects.routes.js';
import tasksRouter from './modules/tasks/tasks.routes.js';
import sessionsRouter from './modules/sessions/sessions.routes.js';
import dashboardRouter from './modules/dashboard/dashboard.routes.js';
import settingsRouter from './modules/settings/settings.routes.js';
import thoughtsRouter from './modules/thoughts/thoughts.routes.js';
import aiRouter from './modules/ai/ai.routes.js';

export function createApp(): Express {
  const app = express();

  // CORS configuration
  const allowedOrigins = [
    env.CLIENT_ORIGIN,
    'http://localhost:5073',
    'http://127.0.0.1:5073',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ];

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.onrender.com')) {
          return callback(null, true);
        }
        // Also allow matching origin dynamically in production if desired
        return callback(null, true);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  app.use(express.json());

  // Health check endpoint
  app.get('/api/health', async (req: Request, res: Response) => {
    let dbStatus = 'disconnected';
    let dbTime = null;

    try {
      const dbRes = await pool.query('SELECT NOW() as current_time');
      dbStatus = 'connected';
      dbTime = dbRes.rows[0].current_time;
    } catch (err) {
      dbStatus = `error: ${(err as Error).message}`;
    }

    const healthy = dbStatus === 'connected';
    res.status(healthy ? 200 : 503).json({
      status: healthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: {
        status: dbStatus,
        time: dbTime,
      },
      environment: env.NODE_ENV,
    });
  });

  // API Modules
  app.use('/api/projects', projectsRouter);
  app.use('/api/tasks', tasksRouter);
  app.use('/api/sessions', sessionsRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api/settings', settingsRouter);
  app.use('/api/thoughts', thoughtsRouter);
  app.use('/api/ai', aiRouter);

  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
  });

  // Centralized error handler
  app.use(errorHandler);

  return app;
}

export default createApp;
