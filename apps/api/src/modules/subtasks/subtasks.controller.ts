import { Request, Response, NextFunction } from 'express';
import { query } from '../../db/pool.js';
import { createSubtaskSchema, updateSubtaskSchema, reorderSubtasksSchema } from './subtasks.schema.js';

export async function listSubtasks(req: Request, res: Response, next: NextFunction) {
  try {
    const { taskId } = req.params;
    const result = await query(
      'SELECT * FROM task_subtasks WHERE task_id = $1 ORDER BY position ASC, created_at ASC',
      [taskId]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

export async function createSubtask(req: Request, res: Response, next: NextFunction) {
  try {
    const { taskId } = req.params;
    const data = createSubtaskSchema.parse(req.body);

    // Verify task exists
    const taskCheck = await query('SELECT id FROM tasks WHERE id = $1', [taskId]);
    if (taskCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Determine position if not provided
    let position = data.position;
    if (position === undefined) {
      const maxPosRes = await query(
        'SELECT COALESCE(MAX(position), -1) + 1 as next_pos FROM task_subtasks WHERE task_id = $1',
        [taskId]
      );
      position = maxPosRes.rows[0].next_pos;
    }

    const result = await query(
      `
      INSERT INTO task_subtasks (task_id, title, position)
      VALUES ($1, $2, $3)
      RETURNING *
      `,
      [taskId, data.title, position]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

export async function updateSubtask(req: Request, res: Response, next: NextFunction) {
  try {
    const { taskId, subtaskId } = req.params;
    const data = updateSubtaskSchema.parse(req.body);

    const updates: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (data.title !== undefined) {
      updates.push(`title = $${idx++}`);
      values.push(data.title);
    }
    if (data.completed !== undefined) {
      updates.push(`completed = $${idx++}`);
      values.push(data.completed);
    }
    if (data.position !== undefined) {
      updates.push(`position = $${idx++}`);
      values.push(data.position);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields provided for update' });
    }

    values.push(subtaskId, taskId);
    const sql = `
      UPDATE task_subtasks
      SET ${updates.join(', ')}
      WHERE id = $${idx++} AND task_id = $${idx}
      RETURNING *
    `;

    const result = await query(sql, values);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Subtask not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

export async function deleteSubtask(req: Request, res: Response, next: NextFunction) {
  try {
    const { taskId, subtaskId } = req.params;
    const result = await query(
      'DELETE FROM task_subtasks WHERE id = $1 AND task_id = $2 RETURNING id',
      [subtaskId, taskId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Subtask not found' });
    }

    res.json({ message: 'Subtask deleted successfully', id: subtaskId });
  } catch (err) {
    next(err);
  }
}

export async function reorderSubtasks(req: Request, res: Response, next: NextFunction) {
  try {
    const { taskId } = req.params;
    const { subtask_ids } = reorderSubtasksSchema.parse(req.body);

    for (let i = 0; i < subtask_ids.length; i++) {
      await query(
        'UPDATE task_subtasks SET position = $1 WHERE id = $2 AND task_id = $3',
        [i, subtask_ids[i], taskId]
      );
    }

    const result = await query(
      'SELECT * FROM task_subtasks WHERE task_id = $1 ORDER BY position ASC',
      [taskId]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

