export type ProjectStatus = 'active' | 'paused' | 'completed';
export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';
export type SessionStatus = 'running' | 'completed' | 'abandoned';
export type FrictionCategory = 'none' | 'fatigue' | 'interruption' | 'scope_creep' | 'complexity' | 'unclear' | 'other';

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  color?: string;
  target_date?: string | null;
  created_at: string;
  updated_at: string;
  total_tasks?: number;
  completed_tasks?: number;
  in_progress_tasks?: number;
}

export interface TaskSubtask {
  id: string;
  task_id: string;
  title: string;
  completed: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  project_id: string;
  project_name?: string;
  project_color?: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  estimated_minutes?: number;
  sort_order?: number;
  recurrence?: 'none' | 'daily' | 'weekly' | 'weekdays' | 'persistent';
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  subtasks_count?: number;
  subtasks_completed_count?: number;
  subtasks?: TaskSubtask[];
}

export interface FocusSession {
  id: string;
  task_id: string | null;
  task_title?: string | null;
  project_id?: string | null;
  project_name?: string | null;
  project_color?: string;
  planned_minutes: number;
  actual_seconds: number;
  status: SessionStatus;
  started_at: string;
  ended_at: string | null;
  accomplishment?: string;
  blockers?: string;
  next_action?: string;
  friction_category?: FrictionCategory;
  cycle_number?: number;
  created_at: string;
}

export interface TodayDashboardData {
  date: string;
  timezone: string;
  next_task: Task | null;
  today_tasks: Task[];
  completed_sessions: FocusSession[];
  total_actual_focus_minutes: number;
  tasks_completed_today: number;
  running_session: FocusSession | null;
  daily_stats: {
    focus_minutes: number;
    sessions_count: number;
    tasks_completed: number;
    daily_target_minutes: number;
    pomodoro_cycles_target?: number;
  };
}

export interface DayMetric {
  day_date: string;
  day_label: string;
  focus_minutes: number;
  planned_minutes: number;
  completed_sessions: number;
  completed_tasks: number;
}

export interface FrictionItem {
  friction_category: FrictionCategory;
  count: number;
}

export interface PeakHourItem {
  hour_of_day: number;
  minutes: number;
}

export interface WeeklyDashboardData {
  days: DayMetric[];
  totals: {
    planned_minutes: number;
    actual_minutes: number;
    completed_sessions: number;
    tasks_completed: number;
    completion_percentage: number;
  };
  streaks: {
    current_streak: number;
    best_streak: number;
  };
  friction_breakdown?: FrictionItem[];
  peak_hours?: PeakHourItem[];
}

export interface UserSettings {
  id?: string;
  daily_target_minutes: number;
  default_focus_minutes: number;
  short_break_minutes: number;
  long_break_minutes: number;
  evening_start_time: string;
  timezone: string;
  enable_notifications: boolean;
  sound_enabled: boolean;
  sound_volume: number;
  ambient_layers?: Record<string, number>;
  pomodoro_cycles_target?: number;
}

export interface ParkedThought {
  id: string;
  content: string;
  category: 'urgent_later' | 'idea' | 'random';
  created_at: string;
  session_id?: string | null;
  converted_to_task?: boolean;
  converted_task_id?: string | null;
}

export interface SubtaskSuggestion {
  title: string;
  estimated_minutes: number;
  tip?: string;
}
