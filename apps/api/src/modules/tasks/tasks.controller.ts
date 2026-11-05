import { Request, Response, NextFunction } from 'express';
import { query } from '../../db/pool.js';
import {
  createTaskSchema,
  updateTaskSchema,
  taskIdParamSchema,
  taskQuerySchema,
} from './tasks.schema.js';

export async function listTasks(req: Request, res: Response, next: NextFunction) {
  try {
    const filters = taskQuerySchema.parse(req.query);

    let sql = `
      SELECT 
        t.*,
        p.name as project_name,
        p.color as project_color,
        COALESCE(sub.total_subtasks, 0)::int as subtasks_count,
        COALESCE(sub.completed_subtasks, 0)::int as subtasks_completed_count
      FROM tasks t
      JOIN projects p ON p.id = t.project_id
      LEFT JOIN (
        SELECT 
          task_id,
          COUNT(*) as total_subtasks,
          COUNT(*) FILTER (WHERE completed = true) as completed_subtasks
        FROM task_subtasks
        GROUP BY task_id
      ) sub ON sub.task_id = t.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let idx = 1;

    if (filters.project_id) {
      sql += ` AND t.project_id = $${idx++}`;
      params.push(filters.project_id);
    }

    if (filters.status) {
      sql += ` AND t.status = $${idx++}`;
      params.push(filters.status);
    }

    if (filters.due_date) {
      sql += ` AND t.due_date = $${idx++}`;
      params.push(filters.due_date);
    }

    if (filters.q) {
      const likeQ = `%${filters.q}%`;
      sql += ` AND (t.title ILIKE $${idx} OR t.description ILIKE $${idx + 1})`;
      idx += 2;
      params.push(likeQ, likeQ);
    }

    sql += `
      ORDER BY 
        t.sort_order ASC NULLS LAST,
        CASE t.priority 
          WHEN 'high' THEN 1 
          WHEN 'medium' THEN 2 
          WHEN 'low' THEN 3 
          ELSE 4 
        END,
        t.due_date ASC NULLS LAST,
        t.created_at DESC
    `;

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

export async function getTask(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = taskIdParamSchema.parse(req.params);

    const result = await query(
      `
      SELECT 
        t.*,
        p.name as project_name,
        p.color as project_color
      FROM tasks t
      JOIN projects p ON p.id = t.project_id
      WHERE t.id = $1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const subtasksRes = await query(
      'SELECT * FROM task_subtasks WHERE task_id = $1 ORDER BY position ASC, created_at ASC',
      [id]
    );

    const task = result.rows[0];
    task.subtasks = subtasksRes.rows;
    task.subtasks_count = subtasksRes.rows.length;
    task.subtasks_completed_count = subtasksRes.rows.filter((s: any) => s.completed).length;

    res.json(task);
  } catch (err) {
    next(err);
  }
}

export async function createTask(req: Request, res: Response, next: NextFunction) {
  try {
    const data = createTaskSchema.parse(req.body);

    // Verify project exists
    const projectCheck = await query('SELECT id FROM projects WHERE id = $1', [data.project_id]);
    if (projectCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Referenced project does not exist' });
    }

    const completedAt = data.status === 'done' ? new Date() : null;

    const result = await query(
      `
      INSERT INTO tasks (project_id, title, description, status, priority, estimated_minutes, sort_order, recurrence, due_date, completed_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
      `,
      [
        data.project_id,
        data.title,
        data.description,
        data.status,
        data.priority,
        data.estimated_minutes || 25,
        data.sort_order || 0,
        data.recurrence || 'none',
        data.due_date || null,
        completedAt,
      ]
    );

    // Fetch with project name & color
    const inserted = await query(
      `
      SELECT t.*, p.name as project_name, p.color as project_color
      FROM tasks t
      JOIN projects p ON p.id = t.project_id
      WHERE t.id = $1
      `,
      [result.rows[0].id]
    );

    res.status(201).json(inserted.rows[0]);
  } catch (err) {
    next(err);
  }
}

export async function updateTask(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = taskIdParamSchema.parse(req.params);
    const data = updateTaskSchema.parse(req.body);

    // Fetch existing task to check status changes
    const existingRes = await query('SELECT * FROM tasks WHERE id = $1', [id]);
    if (existingRes.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    const existing = existingRes.rows[0];

    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (data.project_id !== undefined) {
      const projCheck = await query('SELECT id FROM projects WHERE id = $1', [data.project_id]);
      if (projCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Referenced project does not exist' });
      }
      fields.push(`project_id = $${idx++}`);
      values.push(data.project_id);
    }

    if (data.title !== undefined) {
      fields.push(`title = $${idx++}`);
      values.push(data.title);
    }

    if (data.description !== undefined) {
      fields.push(`description = $${idx++}`);
      values.push(data.description);
    }

    if (data.priority !== undefined) {
      fields.push(`priority = $${idx++}`);
      values.push(data.priority);
    }

    if (data.estimated_minutes !== undefined) {
      fields.push(`estimated_minutes = $${idx++}`);
      values.push(data.estimated_minutes);
    }

    if (data.sort_order !== undefined) {
      fields.push(`sort_order = $${idx++}`);
      values.push(data.sort_order);
    }

    if (data.recurrence !== undefined) {
      fields.push(`recurrence = $${idx++}`);
      values.push(data.recurrence);
    }

    if (data.due_date !== undefined) {
      fields.push(`due_date = $${idx++}`);
      values.push(data.due_date);
    }

    if (data.status !== undefined) {
      fields.push(`status = $${idx++}`);
      values.push(data.status);

      // Handle completed_at timestamp
      if (data.status === 'done' && existing.status !== 'done') {
        fields.push(`completed_at = CURRENT_TIMESTAMP`);
      } else if (data.status !== 'done' && existing.status === 'done') {
        fields.push(`completed_at = NULL`);
      }
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields provided for update' });
    }

    values.push(id);
    const sql = `
      UPDATE tasks
      SET ${fields.join(', ')}
      WHERE id = $${idx}
      RETURNING *
    `;

    await query(sql, values);

    const updated = await query(
      `
      SELECT t.*, p.name as project_name, p.color as project_color
      FROM tasks t
      JOIN projects p ON p.id = t.project_id
      WHERE t.id = $1
      `,
      [id]
    );

    res.json(updated.rows[0]);
  } catch (err) {
    next(err);
  }
}

export async function deleteTask(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = taskIdParamSchema.parse(req.params);

    const result = await query('DELETE FROM tasks WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({ message: 'Task deleted successfully', id });
  } catch (err) {
    next(err);
  }
}

export async function reorderTasks(req: Request, res: Response, next: NextFunction) {
  try {
    const { task_ids } = req.body;
    if (!Array.isArray(task_ids) || task_ids.length === 0) {
      return res.status(400).json({ error: 'task_ids must be a non-empty array' });
    }

    for (let i = 0; i < task_ids.length; i++) {
      await query('UPDATE tasks SET sort_order = $1 WHERE id = $2', [i, task_ids[i]]);
    }

    res.json({ message: 'Tasks reordered successfully', count: task_ids.length });
  } catch (err) {
    next(err);
  }
}
