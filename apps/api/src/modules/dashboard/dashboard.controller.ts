import { Request, Response, NextFunction } from 'express';
import { query } from '../../db/pool.js';
import { env } from '../../config/env.js';
import { rolloverRecurringTasks } from '../tasks/recurrence.service.js';

export async function getTodayDashboard(req: Request, res: Response, next: NextFunction) {
  try {
    const tz = (req.query.timezone as string) || env.APP_TIMEZONE;

    // Automatically check & roll over recurring tasks
    await rolloverRecurringTasks(tz);

    // Fetch user settings for target minutes
    const settingsRes = await query('SELECT daily_target_minutes, pomodoro_cycles_target FROM user_settings WHERE id = $1', ['default']);
    const dailyTargetMinutes = settingsRes.rows[0]?.daily_target_minutes || 60;
    const pomodoroCyclesTarget = settingsRes.rows[0]?.pomodoro_cycles_target || 4;

    // 1. Next task (highest priority pending task)
    const nextTaskRes = await query(
      `
      SELECT 
        t.*, 
        p.name as project_name,
        COALESCE(sub.total_subtasks, 0)::int as subtasks_count,
        COALESCE(sub.completed_subtasks, 0)::int as subtasks_completed_count
      FROM tasks t
      JOIN projects p ON p.id = t.project_id
      LEFT JOIN (
        SELECT task_id, COUNT(*) as total_subtasks, COUNT(*) FILTER (WHERE completed = true) as completed_subtasks
        FROM task_subtasks GROUP BY task_id
      ) sub ON sub.task_id = t.id
      WHERE t.status != 'done' AND p.status = 'active'
      ORDER BY 
        CASE t.priority 
          WHEN 'high' THEN 1 
          WHEN 'medium' THEN 2 
          WHEN 'low' THEN 3 
        END,
        t.due_date ASC NULLS LAST,
        t.created_at ASC
      LIMIT 1
      `
    );
    const nextTask = nextTaskRes.rows[0] || null;

    // 2. Today's active tasks (due today or top priority active tasks)
    const todayTasksRes = await query(
      `
      SELECT 
        t.*, 
        p.name as project_name,
        COALESCE(sub.total_subtasks, 0)::int as subtasks_count,
        COALESCE(sub.completed_subtasks, 0)::int as subtasks_completed_count
      FROM tasks t
      JOIN projects p ON p.id = t.project_id
      LEFT JOIN (
        SELECT task_id, COUNT(*) as total_subtasks, COUNT(*) FILTER (WHERE completed = true) as completed_subtasks
        FROM task_subtasks GROUP BY task_id
      ) sub ON sub.task_id = t.id
      WHERE (
        t.due_date = timezone($1, now())::date
        OR (t.due_date >= timezone($1, now())::date AND t.status IN ('todo', 'in_progress'))
        OR (t.recurrence IN ('daily', 'weekly', 'weekdays', 'persistent') AND p.status = 'active')
        OR (t.status IN ('todo', 'in_progress') AND p.status = 'active')
      )
      ORDER BY 
        CASE t.status 
          WHEN 'in_progress' THEN 1 
          WHEN 'todo' THEN 2 
          ELSE 3 
        END,
        CASE t.priority 
          WHEN 'high' THEN 1 
          WHEN 'medium' THEN 2 
          WHEN 'low' THEN 3 
        END,
        t.created_at ASC
      LIMIT 10
      `,
      [tz]
    );

    // 3. Completed focus sessions today
    const sessionsTodayRes = await query(
      `
      SELECT 
        s.*,
        t.title as task_title,
        p.name as project_name
      FROM focus_sessions s
      LEFT JOIN tasks t ON t.id = s.task_id
      LEFT JOIN projects p ON p.id = t.project_id
      WHERE s.status = 'completed'
        AND timezone($1, COALESCE(s.ended_at, s.started_at))::date = timezone($1, now())::date
      ORDER BY s.started_at DESC
      `,
      [tz]
    );

    // 4. Focus minutes today & total stats
    const statsRes = await query(
      `
      SELECT 
        COALESCE(SUM(actual_seconds), 0)::int as total_actual_seconds,
        COUNT(*)::int as completed_sessions_count
      FROM focus_sessions
      WHERE status = 'completed'
        AND timezone($1, COALESCE(ended_at, started_at))::date = timezone($1, now())::date
      `,
      [tz]
    );

    const totalActualSeconds = statsRes.rows[0]?.total_actual_seconds || 0;
    const totalFocusMinutes = Math.round(totalActualSeconds / 60);

    // 5. Tasks completed today
    const tasksCompletedRes = await query(
      `
      SELECT COUNT(*)::int as count
      FROM tasks
      WHERE status = 'done'
        AND completed_at IS NOT NULL
        AND timezone($1, completed_at)::date = timezone($1, now())::date
      `,
      [tz]
    );
    const tasksCompletedToday = tasksCompletedRes.rows[0]?.count || 0;

    // 6. Currently running session
    const runningRes = await query(
      `
      SELECT 
        s.*,
        t.title as task_title,
        p.name as project_name
      FROM focus_sessions s
      LEFT JOIN tasks t ON t.id = s.task_id
      LEFT JOIN projects p ON p.id = t.project_id
      WHERE s.status = 'running'
      LIMIT 1
      `
    );
    const runningSession = runningRes.rows[0] || null;

    res.json({
      date: new Date().toISOString(),
      timezone: tz,
      next_task: nextTask,
      today_tasks: todayTasksRes.rows,
      completed_sessions: sessionsTodayRes.rows,
      total_actual_focus_minutes: totalFocusMinutes,
      tasks_completed_today: tasksCompletedToday,
      running_session: runningSession,
      daily_stats: {
        focus_minutes: totalFocusMinutes,
        sessions_count: statsRes.rows[0]?.completed_sessions_count || 0,
        tasks_completed: tasksCompletedToday,
        daily_target_minutes: dailyTargetMinutes,
        pomodoro_cycles_target: pomodoroCyclesTarget,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getWeeklyDashboard(req: Request, res: Response, next: NextFunction) {
  try {
    const tz = (req.query.timezone as string) || env.APP_TIMEZONE;

    // Generate 7-day breakdown (last 7 days including today)
    const daysRes = await query(
      `
      WITH days AS (
        SELECT (timezone($1, now())::date - (i || ' days')::interval)::date as day_date
        FROM generate_series(6, 0, -1) as i
      ),
      session_stats AS (
        SELECT 
          timezone($1, COALESCE(ended_at, started_at))::date as session_date,
          COALESCE(SUM(actual_seconds), 0)::int as actual_seconds,
          COALESCE(SUM(planned_minutes), 0)::int as planned_minutes,
          COUNT(CASE WHEN status = 'completed' THEN 1 END)::int as completed_sessions
        FROM focus_sessions
        WHERE timezone($1, COALESCE(ended_at, started_at))::date >= timezone($1, now())::date - interval '6 days'
        GROUP BY 1
      ),
      task_stats AS (
        SELECT 
          timezone($1, completed_at)::date as task_date,
          COUNT(*)::int as completed_tasks
        FROM tasks
        WHERE status = 'done' 
          AND completed_at IS NOT NULL
          AND timezone($1, completed_at)::date >= timezone($1, now())::date - interval '6 days'
        GROUP BY 1
      )
      SELECT 
        d.day_date,
        TO_CHAR(d.day_date, 'Dy') as day_label,
        COALESCE(s.planned_minutes, 0) as planned_minutes,
        ROUND(COALESCE(s.actual_seconds, 0) / 60)::int as focus_minutes,
        COALESCE(s.completed_sessions, 0) as completed_sessions,
        COALESCE(t.completed_tasks, 0) as completed_tasks
      FROM days d
      LEFT JOIN session_stats s ON s.session_date = d.day_date
      LEFT JOIN task_stats t ON t.task_date = d.day_date
      ORDER BY d.day_date ASC
      `,
      [tz]
    );

    const dailyBreakdown = daysRes.rows;
    const totalPlannedMinutes = dailyBreakdown.reduce((acc, d) => acc + Number(d.planned_minutes), 0);
    const totalActualMinutes = dailyBreakdown.reduce((acc, d) => acc + Number(d.focus_minutes), 0);
    const totalCompletedSessions = dailyBreakdown.reduce((acc, d) => acc + Number(d.completed_sessions), 0);
    const totalTasksCompleted = dailyBreakdown.reduce((acc, d) => acc + Number(d.completed_tasks), 0);

    // Calculate streaks
    const activityDaysRes = await query(
      `
      SELECT DISTINCT act_date
      FROM (
        SELECT timezone($1, COALESCE(ended_at, started_at))::date as act_date
        FROM focus_sessions
        WHERE status = 'completed'
        UNION
        SELECT timezone($1, completed_at)::date as act_date
        FROM tasks
        WHERE status = 'done' AND completed_at IS NOT NULL
      ) all_dates
      ORDER BY act_date DESC
      `,
      [tz]
    );

    const activeDates = activityDaysRes.rows.map((r: { act_date: Date }) => {
      const d = new Date(r.act_date);
      return d.toISOString().split('T')[0];
    });

    let currentStreak = 0;
    let bestStreak = 0;

    if (activeDates.length > 0) {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      const activeSet = new Set(activeDates);

      let checkDate = new Date(today);
      if (!activeSet.has(todayStr) && activeSet.has(yesterdayStr)) {
        checkDate = new Date(yesterday);
      }

      while (true) {
        const dateStr = checkDate.toISOString().split('T')[0];
        if (activeSet.has(dateStr)) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }

      const sortedDatesAsc = [...activeDates].sort();
      let tempStreak = 0;
      let prevDate: Date | null = null;

      for (const dStr of sortedDatesAsc) {
        const curDate = new Date(dStr);
        if (prevDate) {
          const diffDays = Math.round((curDate.getTime() - prevDate.getTime()) / (1000 * 3600 * 24));
          if (diffDays === 1) {
            tempStreak++;
          } else if (diffDays > 1) {
            tempStreak = 1;
          }
        } else {
          tempStreak = 1;
        }
        if (tempStreak > bestStreak) {
          bestStreak = tempStreak;
        }
        prevDate = curDate;
      }
    }

    // Friction breakdown (causes of abandoned sessions)
    const frictionRes = await query(
      `
      SELECT 
        friction_category,
        COUNT(*)::int as count
      FROM focus_sessions
      WHERE status = 'abandoned'
      GROUP BY friction_category
      ORDER BY count DESC
      `
    );

    // Peak productive hours distribution (hourly focus minutes across all sessions)
    const peakHoursRes = await query(
      `
      SELECT 
        EXTRACT(HOUR FROM timezone($1, started_at))::int as hour_of_day,
        ROUND(COALESCE(SUM(actual_seconds), 0) / 60)::int as minutes
      FROM focus_sessions
      WHERE status = 'completed'
      GROUP BY 1
      ORDER BY 1 ASC
      `,
      [tz]
    );

    res.json({
      days: dailyBreakdown,
      totals: {
        planned_minutes: totalPlannedMinutes,
        actual_minutes: totalActualMinutes,
        completed_sessions: totalCompletedSessions,
        tasks_completed: totalTasksCompleted,
        completion_percentage:
          totalPlannedMinutes > 0 ? Math.round((totalActualMinutes / totalPlannedMinutes) * 100) : 0,
      },
      streaks: {
        current_streak: currentStreak,
        best_streak: Math.max(bestStreak, currentStreak),
      },
      friction_breakdown: frictionRes.rows,
      peak_hours: peakHoursRes.rows,
    });
  } catch (err) {
    next(err);
  }
}
