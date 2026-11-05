import { query } from '../../db/pool.js';
import { env } from '../../config/env.js';

/**
 * Checks for recurring tasks that were completed on previous days
 * and resets them or rolls them forward to today.
 */
export async function rolloverRecurringTasks(timezone: string = env.APP_TIMEZONE): Promise<{ rolledCount: number }> {
  try {
    // Find all completed tasks with recurrence whose completed_at was before today's local date
    const checkSql = `
      SELECT t.id, t.title, t.recurrence, t.completed_at
      FROM tasks t
      WHERE t.status = 'done'
        AND t.recurrence IN ('daily', 'weekly', 'weekdays', 'persistent')
        AND timezone($1, t.completed_at)::date < timezone($1, now())::date
    `;

    const candidates = await query(checkSql, [timezone]);
    if (candidates.rows.length === 0) {
      return { rolledCount: 0 };
    }

    let rolledCount = 0;
    const nowRes = await query('SELECT EXTRACT(DOW FROM timezone($1, now())) as dow', [timezone]);
    const currentDow = Number(nowRes.rows[0].dow); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

    for (const task of candidates.rows) {
      let shouldReset = false;

      if (task.recurrence === 'daily' || task.recurrence === 'persistent') {
        shouldReset = true;
      } else if (task.recurrence === 'weekdays') {
        // Only on Monday (1) through Friday (5)
        if (currentDow >= 1 && currentDow <= 5) {
          shouldReset = true;
        }
      } else if (task.recurrence === 'weekly') {
        const daysSinceRes = await query(
          'SELECT (timezone($1, now())::date - timezone($1, $2)::date) as days',
          [timezone, task.completed_at]
        );
        const days = Number(daysSinceRes.rows[0]?.days || 0);
        if (days >= 7) {
          shouldReset = true;
        }
      }

      if (shouldReset) {
        await query(
          `
          UPDATE tasks
          SET 
            status = 'todo',
            completed_at = NULL,
            due_date = timezone($1, now())::date,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
          `,
          [timezone, task.id]
        );
        rolledCount++;
      }
    }

    if (rolledCount > 0) {
      console.log(`[RecurrenceService] Rolled over ${rolledCount} recurring task(s) for ${timezone}.`);
    }

    return { rolledCount };
  } catch (err) {
    console.error('[RecurrenceService] Error rolling over tasks:', err);
    return { rolledCount: 0 };
  }
}

