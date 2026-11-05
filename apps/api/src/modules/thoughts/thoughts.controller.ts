import { Request, Response, NextFunction } from 'express';
import { query, pool } from '../../db/pool.js';
import {
  createThoughtSchema,
  updateThoughtSchema,
  convertThoughtToTaskSchema,
} from './thoughts.schema.js';

export async function listThoughts(req: Request, res: Response, next: NextFunction) {
  try {
    const { session_id, converted } = req.query;
    let sql = 'SELECT * FROM parked_thoughts WHERE 1=1';
    const params: any[] = [];
    let idx = 1;

    if (session_id) {
      sql += ` AND session_id = $${idx++}`;
      params.push(session_id);
    }

    if (converted !== undefined) {
      sql += ` AND converted_to_task = $${idx++}`;
      params.push(converted === 'true');
    }

    sql += ' ORDER BY created_at DESC';

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

export async function createThought(req: Request, res: Response, next: NextFunction) {
  try {
    const data = createThoughtSchema.parse(req.body);

    const result = await query(
      `
      INSERT INTO parked_thoughts (session_id, content, category)
      VALUES ($1, $2, $3)
      RETURNING *
      `,
      [data.session_id || null, data.content, data.category]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

export async function updateThought(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const data = updateThoughtSchema.parse(req.body);

    const updates: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (data.content !== undefined) {
      updates.push(`content = $${idx++}`);
      values.push(data.content);
    }
    if (data.category !== undefined) {
      updates.push(`category = $${idx++}`);
      values.push(data.category);
    }
    if (data.converted_to_task !== undefined) {
      updates.push(`converted_to_task = $${idx++}`);
      values.push(data.converted_to_task);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields provided for update' });
    }

    values.push(id);
    const sql = `
      UPDATE parked_thoughts
      SET ${updates.join(', ')}
      WHERE id = $${idx}
      RETURNING *
    `;

    const result = await query(sql, values);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Parked thought not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

export async function deleteThought(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM parked_thoughts WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Parked thought not found' });
    }

    res.json({ message: 'Thought deleted successfully', id });
  } catch (err) {
    next(err);
  }
}

export async function convertThoughtToTask(req: Request, res: Response, next: NextFunction) {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const data = convertThoughtToTaskSchema.parse(req.body);

    await client.query('BEGIN');

    // 1. Get thought
    const thoughtRes = await client.query(
      'SELECT * FROM parked_thoughts WHERE id = $1 FOR UPDATE',
      [id]
    );
    if (thoughtRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Parked thought not found' });
    }
    const thought = thoughtRes.rows[0];

    // 2. Check project
    const projRes = await client.query('SELECT id FROM projects WHERE id = $1', [data.project_id]);
    if (projRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Project not found' });
    }

    // 3. Create task
    const taskRes = await client.query(
      `
      INSERT INTO tasks (project_id, title, description, status, priority, due_date)
      VALUES ($1, $2, $3, 'todo', $4, $5)
      RETURNING *
      `,
      [
        data.project_id,
        thought.content,
        `Converted from Parked Thought [${thought.category}]`,
        data.priority,
        data.due_date || null,
      ]
    );
    const createdTask = taskRes.rows[0];

    // 4. Update thought
    const updatedThoughtRes = await client.query(
      `
      UPDATE parked_thoughts
      SET converted_to_task = TRUE, converted_task_id = $1
      WHERE id = $2
      RETURNING *
      `,
      [createdTask.id, id]
    );

    await client.query('COMMIT');

    res.status(201).json({
      task: createdTask,
      thought: updatedThoughtRes.rows[0],
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

