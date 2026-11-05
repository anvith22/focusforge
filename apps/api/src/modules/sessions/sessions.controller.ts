import { Request, Response, NextFunction } from 'express';
import { query } from '../../db/pool.js';
import {
  startSessionSchema,
  completeSessionSchema,
  abandonSessionSchema,
  sessionIdParamSchema,
  sessionQuerySchema,
} from './sessions.schema.js';

export async function listSessions(req: Request, res: Response, next: NextFunction) {
  try {
    const filters = sessionQuerySchema.parse(req.query);

    let sql = `
      SELECT 
        s.*,
        t.title as task_title,
        t.project_id,
        p.name as project_name,
        p.color as project_color
      FROM focus_sessions s
      LEFT JOIN tasks t ON t.id = s.task_id
      LEFT JOIN projects p ON p.id = t.project_id
      WHERE 1=1
    `;
    const params: any[] = [];
    let idx = 1;

    if (filters.status) {
      sql += ` AND s.status = $${idx++}`;
      params.push(filters.status);
    }

    if (filters.task_id) {
      sql += ` AND s.task_id = $${idx++}`;
      params.push(filters.task_id);
    }

    if (filters.from_date) {
      sql += ` AND DATE(s.started_at) >= $${idx++}`;
      params.push(filters.from_date);
    }

    if (filters.to_date) {
      sql += ` AND DATE(s.started_at) <= $${idx++}`;
      params.push(filters.to_date);
    }

    sql += ` ORDER BY s.started_at DESC LIMIT $${idx}`;
    params.push(filters.limit);

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

export async function getSession(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = sessionIdParamSchema.parse(req.params);

    const result = await query(
      `
      SELECT 
        s.*,
        t.title as task_title,
        t.project_id,
        p.name as project_name,
        p.color as project_color
      FROM focus_sessions s
      LEFT JOIN tasks t ON t.id = s.task_id
      LEFT JOIN projects p ON p.id = t.project_id
      WHERE s.id = $1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Focus session not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

export async function getActiveSession(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await query(
      `
      SELECT 
        s.*,
        t.title as task_title,
        t.project_id,
        p.name as project_name
      FROM focus_sessions s
      LEFT JOIN tasks t ON t.id = s.task_id
      LEFT JOIN projects p ON p.id = t.project_id
      WHERE s.status = 'running'
      LIMIT 1
      `
    );

    res.json(result.rows[0] || null);
  } catch (err) {
    next(err);
  }
}

export async function startSession(req: Request, res: Response, next: NextFunction) {
  try {
    const data = startSessionSchema.parse(req.body);

    // If task_id provided, ensure task exists
    if (data.task_id) {
      const taskCheck = await query('SELECT id FROM tasks WHERE id = $1', [data.task_id]);
      if (taskCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Referenced task does not exist' });
      }
    }

    // App-level check for active session
    const activeCheck = await query(
      "SELECT id FROM focus_sessions WHERE status = 'running' LIMIT 1"
    );
    if (activeCheck.rows.length > 0) {
      return res.status(409).json({
        error: 'A focus session is already running. Please complete or abandon it first.',
        activeSessionId: activeCheck.rows[0].id,
      });
    }

    // Insert new session (Postgres partial unique index will also guard race conditions)
    const result = await query(
      `
      INSERT INTO focus_sessions (task_id, planned_minutes, status, cycle_number, started_at)
      VALUES ($1, $2, 'running', $3, CURRENT_TIMESTAMP)
      RETURNING *
      `,
      [data.task_id || null, data.planned_minutes, data.cycle_number || 1]
    );

    const created = await query(
      `
      SELECT 
        s.*,
        t.title as task_title,
        t.project_id,
        p.name as project_name
      FROM focus_sessions s
      LEFT JOIN tasks t ON t.id = s.task_id
      LEFT JOIN projects p ON p.id = t.project_id
      WHERE s.id = $1
      `,
      [result.rows[0].id]
    );

    res.status(201).json(created.rows[0]);
  } catch (err) {
    next(err);
  }
}

export async function completeSession(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = sessionIdParamSchema.parse(req.params);
    const data = completeSessionSchema.parse(req.body);

    const sessionRes = await query('SELECT * FROM focus_sessions WHERE id = $1', [id]);
    if (sessionRes.rows.length === 0) {
      return res.status(404).json({ error: 'Focus session not found' });
    }

    const session = sessionRes.rows[0];
    if (session.status !== 'running') {
      return res.status(400).json({
        error: `Cannot complete session with status '${session.status}'. Only running sessions can be completed.`,
      });
    }

    const result = await query(
      `
      UPDATE focus_sessions
      SET 
        status = 'completed',
        actual_seconds = $1,
        accomplishment = $2,
        blockers = $3,
        next_action = $4,
        ended_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING *
      `,
      [data.actual_seconds, data.accomplishment, data.blockers, data.next_action, id]
    );

    // If session had a next_action and a task_id, we can keep it connected
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

export async function abandonSession(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = sessionIdParamSchema.parse(req.params);
    const data = abandonSessionSchema.parse(req.body);

    const sessionRes = await query('SELECT * FROM focus_sessions WHERE id = $1', [id]);
    if (sessionRes.rows.length === 0) {
      return res.status(404).json({ error: 'Focus session not found' });
    }

    const session = sessionRes.rows[0];
    if (session.status !== 'running') {
      return res.status(400).json({
        error: `Cannot abandon session with status '${session.status}'. Only running sessions can be abandoned.`,
      });
    }

    const result = await query(
      `
      UPDATE focus_sessions
      SET 
        status = 'abandoned',
        actual_seconds = $1,
        blockers = $2,
        next_action = $3,
        friction_category = $4,
        ended_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING *
      `,
      [data.actual_seconds, data.blockers, data.next_action, data.friction_category || 'none', id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}
