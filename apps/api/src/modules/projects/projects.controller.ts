import { Request, Response, NextFunction } from 'express';
import { query } from '../../db/pool.js';
import {
  createProjectSchema,
  updateProjectSchema,
  projectIdParamSchema,
} from './projects.schema.js';

export async function listProjects(req: Request, res: Response, next: NextFunction) {
  try {
    const { status } = req.query;
    let sql = `
      SELECT 
        p.*,
        COUNT(t.id)::int as total_tasks,
        COUNT(CASE WHEN t.status = 'done' THEN 1 END)::int as completed_tasks,
        COUNT(CASE WHEN t.status = 'in_progress' THEN 1 END)::int as in_progress_tasks
      FROM projects p
      LEFT JOIN tasks t ON t.project_id = p.id
    `;
    const params: any[] = [];

    if (status && typeof status === 'string') {
      sql += ' WHERE p.status = $1';
      params.push(status);
    }

    sql += ' GROUP BY p.id ORDER BY p.created_at DESC';

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

export async function getProject(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = projectIdParamSchema.parse(req.params);

    const result = await query(
      `
      SELECT 
        p.*,
        COUNT(t.id)::int as total_tasks,
        COUNT(CASE WHEN t.status = 'done' THEN 1 END)::int as completed_tasks
      FROM projects p
      LEFT JOIN tasks t ON t.project_id = p.id
      WHERE p.id = $1
      GROUP BY p.id
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

export async function createProject(req: Request, res: Response, next: NextFunction) {
  try {
    const data = createProjectSchema.parse(req.body);

    const result = await query(
      `
      INSERT INTO projects (name, description, status, color, target_date)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
      `,
      [
        data.name,
        data.description,
        data.status,
        data.color || '#3b82f6',
        data.target_date || null,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

export async function updateProject(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = projectIdParamSchema.parse(req.params);
    const data = updateProjectSchema.parse(req.body);

    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (data.name !== undefined) {
      fields.push(`name = $${idx++}`);
      values.push(data.name);
    }
    if (data.description !== undefined) {
      fields.push(`description = $${idx++}`);
      values.push(data.description);
    }
    if (data.status !== undefined) {
      fields.push(`status = $${idx++}`);
      values.push(data.status);
    }
    if (data.color !== undefined) {
      fields.push(`color = $${idx++}`);
      values.push(data.color);
    }
    if (data.target_date !== undefined) {
      fields.push(`target_date = $${idx++}`);
      values.push(data.target_date);
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields provided for update' });
    }

    values.push(id);
    const sql = `
      UPDATE projects 
      SET ${fields.join(', ')} 
      WHERE id = $${idx}
      RETURNING *
    `;

    const result = await query(sql, values);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

export async function deleteProject(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = projectIdParamSchema.parse(req.params);

    // Check if project exists and has tasks
    const taskCountRes = await query(
      'SELECT COUNT(*)::int as count FROM tasks WHERE project_id = $1',
      [id]
    );
    const taskCount = taskCountRes.rows[0]?.count || 0;

    // Check query param force
    const force = req.query.force === 'true';

    if (taskCount > 0 && !force) {
      return res.status(400).json({
        error: `Cannot delete project with ${taskCount} active task(s). Provide confirm/force parameter to proceed.`,
        taskCount,
      });
    }

    const result = await query('DELETE FROM projects WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json({ message: 'Project deleted successfully', id });
  } catch (err) {
    next(err);
  }
}
