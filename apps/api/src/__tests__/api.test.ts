import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { pool, closePool } from '../db/pool.js';
import { runMigrations } from '../db/migrate.js';

const app = createApp();

describe('FocusForge Backend API Tests', () => {
  let testProjectId: string;
  let testTaskId: string;
  let testSessionId: string;

  beforeAll(async () => {
    // Ensure migrations are run before testing
    await runMigrations();
  });

  afterAll(async () => {
    // Clean up test data if needed and close pool
    if (testProjectId) {
      await pool.query('DELETE FROM projects WHERE id = $1', [testProjectId]);
    }
    await closePool();
  });

  // 1. Health check
  describe('GET /api/health', () => {
    it('returns healthy status and database connection info', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
      expect(res.body.database.status).toBe('connected');
    });
  });

  // 2. Projects CRUD
  describe('Projects API', () => {
    it('validates required fields on project creation', async () => {
      const res = await request(app).post('/api/projects').send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
    });

    it('creates a new project', async () => {
      const res = await request(app).post('/api/projects').send({
        name: 'Test Project Vitest',
        description: 'Test Project Description',
        status: 'active',
      });
      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.name).toBe('Test Project Vitest');
      testProjectId = res.body.id;
    });

    it('gets a project by ID', async () => {
      const res = await request(app).get(`/api/projects/${testProjectId}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(testProjectId);
    });

    it('returns 404 for missing project ID', async () => {
      const res = await request(app).get('/api/projects/a0000000-0000-0000-0000-000000000000');
      expect(res.status).toBe(404);
    });

    it('returns 400 for invalid UUID format', async () => {
      const res = await request(app).get('/api/projects/invalid-uuid');
      expect(res.status).toBe(400);
    });
  });

  // 3. Tasks CRUD & Completion Timestamps
  describe('Tasks API', () => {
    it('creates a task associated with a project', async () => {
      const res = await request(app).post('/api/tasks').send({
        project_id: testProjectId,
        title: 'Complete unit tests',
        description: 'Test all endpoints',
        priority: 'high',
        status: 'todo',
      });
      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.completed_at).toBeNull();
      testTaskId = res.body.id;
    });

    it('sets completed_at when status is updated to done', async () => {
      const res = await request(app).patch(`/api/tasks/${testTaskId}`).send({
        status: 'done',
      });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('done');
      expect(res.body.completed_at).not.toBeNull();
    });

    it('clears completed_at when task is reopened to in_progress', async () => {
      const res = await request(app).patch(`/api/tasks/${testTaskId}`).send({
        status: 'in_progress',
      });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('in_progress');
      expect(res.body.completed_at).toBeNull();
    });

    it('filters tasks by project and status', async () => {
      const res = await request(app)
        .get('/api/tasks')
        .query({ project_id: testProjectId, status: 'in_progress' });
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });
  });

  // 4. Focus Sessions Lifecycle & Concurrency Guard
  describe('Focus Sessions API', () => {
    it('starts a new focus session', async () => {
      // First ensure no lingering running sessions from previous runs
      await pool.query("UPDATE focus_sessions SET status = 'abandoned' WHERE status = 'running'");

      const res = await request(app).post('/api/sessions').send({
        task_id: testTaskId,
        planned_minutes: 25,
      });
      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.status).toBe('running');
      testSessionId = res.body.id;
    });

    it('prevents starting concurrent running sessions (409 Conflict)', async () => {
      const res = await request(app).post('/api/sessions').send({
        task_id: testTaskId,
        planned_minutes: 15,
      });
      expect(res.status).toBe(409);
      expect(res.body.error).toContain('already running');
    });

    it('completes the running session with actual seconds and reflection', async () => {
      const res = await request(app).post(`/api/sessions/${testSessionId}/complete`).send({
        actual_seconds: 1500,
        accomplishment: 'Implemented unit tests successfully',
        blockers: 'None',
        next_action: 'Build the dashboard UI',
      });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('completed');
      expect(res.body.actual_seconds).toBe(1500);
      expect(res.body.accomplishment).toBe('Implemented unit tests successfully');
      expect(res.body.ended_at).not.toBeNull();
    });

    it('prevents re-completing an already completed session', async () => {
      const res = await request(app).post(`/api/sessions/${testSessionId}/complete`).send({
        actual_seconds: 1500,
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Cannot complete session');
    });

    it('allows starting a new session once the previous one ended, and allows abandoning it', async () => {
      const startRes = await request(app).post('/api/sessions').send({
        task_id: testTaskId,
        planned_minutes: 10,
      });
      expect(startRes.status).toBe(201);
      const newSessionId = startRes.body.id;

      const abandonRes = await request(app).post(`/api/sessions/${newSessionId}/abandon`).send({
        actual_seconds: 180,
        blockers: 'Interrupted by unexpected phone call',
      });
      expect(abandonRes.status).toBe(200);
      expect(abandonRes.body.status).toBe('abandoned');
      expect(abandonRes.body.actual_seconds).toBe(180);
      expect(abandonRes.body.blockers).toBe('Interrupted by unexpected phone call');
    });
  });

  // 5. Subtasks API
  describe('Subtasks API', () => {
    let testSubtaskId: string;

    it('creates a subtask for a task', async () => {
      const res = await request(app).post(`/api/tasks/${testTaskId}/subtasks`).send({
        title: 'Draft API route',
      });
      expect(res.status).toBe(201);
      expect(res.body.title).toBe('Draft API route');
      expect(res.body.completed).toBe(false);
      testSubtaskId = res.body.id;
    });

    it('lists subtasks for a task', async () => {
      const res = await request(app).get(`/api/tasks/${testTaskId}/subtasks`);
      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });

    it('toggles subtask completion', async () => {
      const res = await request(app)
        .patch(`/api/tasks/${testTaskId}/subtasks/${testSubtaskId}`)
        .send({ completed: true });
      expect(res.status).toBe(200);
      expect(res.body.completed).toBe(true);
    });
  });

  // 6. Parked Thoughts API
  describe('Parked Thoughts API', () => {
    let thoughtId: string;

    it('creates a parked thought', async () => {
      const res = await request(app).post('/api/thoughts').send({
        content: 'Check redis caching layer tomorrow',
        category: 'idea',
      });
      expect(res.status).toBe(201);
      expect(res.body.content).toBe('Check redis caching layer tomorrow');
      thoughtId = res.body.id;
    });

    it('converts parked thought to a task in a transaction', async () => {
      const res = await request(app)
        .post(`/api/thoughts/${thoughtId}/convert-to-task`)
        .send({
          project_id: testProjectId,
          priority: 'medium',
        });
      expect(res.status).toBe(201);
      expect(res.body.task).toBeDefined();
      expect(res.body.thought.converted_to_task).toBe(true);
    });
  });

  // 7. Settings API
  describe('Settings API', () => {
    it('retrieves persistent user settings', async () => {
      const res = await request(app).get('/api/settings');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('daily_target_minutes');
    });

    it('updates user settings', async () => {
      const res = await request(app).put('/api/settings').send({
        daily_target_minutes: 90,
        enable_notifications: true,
      });
      expect(res.status).toBe(200);
      expect(res.body.daily_target_minutes).toBe(90);
    });
  });

  // 8. AI Task Breakdown API
  describe('AI Breakdown API', () => {
    it('breaks down a task into actionable micro-subtasks', async () => {
      const res = await request(app).post(`/api/ai/tasks/${testTaskId}/breakdown`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('suggestions');
      expect(res.body.suggestions.length).toBeGreaterThanOrEqual(3);
      expect(res.body.suggestions[0]).toHaveProperty('title');
      expect(res.body.suggestions[0]).toHaveProperty('estimated_minutes');
    });
  });

  // 9. Dashboard endpoints
  describe('Dashboard API', () => {
    it('returns today statistics from PostgreSQL', async () => {
      const res = await request(app).get('/api/dashboard/today');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('next_task');
      expect(res.body).toHaveProperty('today_tasks');
      expect(res.body).toHaveProperty('completed_sessions');
      expect(res.body).toHaveProperty('total_actual_focus_minutes');
      expect(res.body).toHaveProperty('tasks_completed_today');
      expect(res.body).toHaveProperty('daily_stats');
      expect(typeof res.body.total_actual_focus_minutes).toBe('number');
    });

    it('returns weekly statistics with consistency streaks from PostgreSQL', async () => {
      const res = await request(app).get('/api/dashboard/weekly');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('days');
      expect(Array.isArray(res.body.days)).toBe(true);
      expect(res.body.days.length).toBe(7);
      expect(res.body).toHaveProperty('totals');
      expect(res.body.totals).toHaveProperty('actual_minutes');
      expect(res.body).toHaveProperty('streaks');
      expect(typeof res.body.streaks.current_streak).toBe('number');
      expect(typeof res.body.streaks.best_streak).toBe('number');
    });
  });
});
