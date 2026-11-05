import {
  Project,
  Task,
  TaskSubtask,
  FocusSession,
  TodayDashboardData,
  WeeklyDashboardData,
  UserSettings,
  ParkedThought,
  SubtaskSuggestion,
  FrictionCategory,
} from '../types';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  const contentType = res.headers.get('content-type') || '';

  if (!res.ok) {
    let errorMessage = `API request failed with status ${res.status}`;
    try {
      if (contentType.includes('application/json')) {
        const errorJson = await res.json();
        errorMessage = errorJson.error || errorJson.message || errorMessage;
      } else {
        const text = await res.text();
        if (text) errorMessage = text;
      }
    } catch {
      // fallback
    }
    throw new Error(errorMessage);
  }

  if (!contentType.includes('application/json')) {
    const text = await res.text();
    if (text.includes('<!DOCTYPE') || text.includes('<html')) {
      throw new Error(
        `API not connected: Frontend received HTML instead of JSON from ${url}. Ensure VITE_API_URL is configured to your public focusforge-api URL.`
      );
    }
  }

  return res.json();
}

// Health API
export async function getHealth() {
  return request<{ status: string; environment?: string; database: { status: string } }>('/health');
}

// Projects API
export async function getProjects(status?: string): Promise<Project[]> {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  return request<Project[]>(`/projects${query}`);
}

export async function getProject(id: string): Promise<Project> {
  return request<Project>(`/projects/${id}`);
}

export async function createProject(data: {
  name: string;
  description?: string;
  status?: string;
  color?: string;
  target_date?: string | null;
}): Promise<Project> {
  return request<Project>('/projects', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateProject(
  id: string,
  data: Partial<Pick<Project, 'name' | 'description' | 'status' | 'color' | 'target_date'>>
): Promise<Project> {
  return request<Project>(`/projects/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteProject(id: string, force = false): Promise<{ message: string; id: string }> {
  return request<{ message: string; id: string }>(`/projects/${id}${force ? '?force=true' : ''}`, {
    method: 'DELETE',
  });
}

// Tasks API
export async function getTasks(filters?: {
  project_id?: string;
  status?: string;
  due_date?: string;
  q?: string;
}): Promise<Task[]> {
  const params = new URLSearchParams();
  if (filters?.project_id) params.append('project_id', filters.project_id);
  if (filters?.status) params.append('status', filters.status);
  if (filters?.due_date) params.append('due_date', filters.due_date);
  if (filters?.q) params.append('q', filters.q);

  const qs = params.toString();
  return request<Task[]>(`/tasks${qs ? `?${qs}` : ''}`);
}

export async function getTask(id: string): Promise<Task> {
  return request<Task>(`/tasks/${id}`);
}

export async function createTask(data: {
  project_id: string;
  title: string;
  description?: string;
  priority?: string;
  estimated_minutes?: number;
  sort_order?: number;
  recurrence?: string;
  due_date?: string | null;
  status?: string;
}): Promise<Task> {
  return request<Task>('/tasks', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateTask(id: string, data: Partial<Task>): Promise<Task> {
  return request<Task>(`/tasks/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function reorderTasks(taskIds: string[]): Promise<{ message: string; count: number }> {
  return request<{ message: string; count: number }>('/tasks/reorder', {
    method: 'PATCH',
    body: JSON.stringify({ task_ids: taskIds }),
  });
}

export async function deleteTask(id: string): Promise<{ message: string; id: string }> {
  return request<{ message: string; id: string }>(`/tasks/${id}`, {
    method: 'DELETE',
  });
}

// Subtasks API
export async function getSubtasks(taskId: string): Promise<TaskSubtask[]> {
  return request<TaskSubtask[]>(`/tasks/${taskId}/subtasks`);
}

export async function createSubtask(taskId: string, title: string, position?: number): Promise<TaskSubtask> {
  return request<TaskSubtask>(`/tasks/${taskId}/subtasks`, {
    method: 'POST',
    body: JSON.stringify({ title, position }),
  });
}

export async function updateSubtask(
  taskId: string,
  subtaskId: string,
  data: Partial<Pick<TaskSubtask, 'title' | 'completed' | 'position'>>
): Promise<TaskSubtask> {
  return request<TaskSubtask>(`/tasks/${taskId}/subtasks/${subtaskId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteSubtask(taskId: string, subtaskId: string): Promise<{ message: string; id: string }> {
  return request<{ message: string; id: string }>(`/tasks/${taskId}/subtasks/${subtaskId}`, {
    method: 'DELETE',
  });
}

export async function reorderSubtasks(taskId: string, subtask_ids: string[]): Promise<TaskSubtask[]> {
  return request<TaskSubtask[]>(`/tasks/${taskId}/subtasks/reorder`, {
    method: 'PATCH',
    body: JSON.stringify({ subtask_ids }),
  });
}

// AI Task Breakdown API
export async function breakDownTaskWithAI(taskId: string): Promise<{
  task_id: string;
  source: string;
  suggestions: SubtaskSuggestion[];
}> {
  return request<{ task_id: string; source: string; suggestions: SubtaskSuggestion[] }>(
    `/ai/tasks/${taskId}/breakdown`,
    { method: 'POST' }
  );
}

// Focus Sessions API
export async function getSessions(filters?: {
  status?: string;
  task_id?: string;
  limit?: number;
  from_date?: string;
  to_date?: string;
}): Promise<FocusSession[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.append('status', filters.status);
  if (filters?.task_id) params.append('task_id', filters.task_id);
  if (filters?.limit) params.append('limit', String(filters.limit));
  if (filters?.from_date) params.append('from_date', filters.from_date);
  if (filters?.to_date) params.append('to_date', filters.to_date);

  const qs = params.toString();
  return request<FocusSession[]>(`/sessions${qs ? `?${qs}` : ''}`);
}

export async function getActiveSession(): Promise<FocusSession | null> {
  return request<FocusSession | null>('/sessions/active');
}

export async function startSession(data: {
  task_id?: string | null;
  planned_minutes: number;
  cycle_number?: number;
}): Promise<FocusSession> {
  return request<FocusSession>('/sessions', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function completeSession(
  id: string,
  data: {
    actual_seconds: number;
    accomplishment?: string;
    blockers?: string;
    next_action?: string;
  }
): Promise<FocusSession> {
  return request<FocusSession>(`/sessions/${id}/complete`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function abandonSession(
  id: string,
  data: {
    actual_seconds: number;
    blockers?: string;
    next_action?: string;
    friction_category?: FrictionCategory;
  }
): Promise<FocusSession> {
  return request<FocusSession>(`/sessions/${id}/abandon`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// Parked Thoughts API
export async function getThoughts(filters?: { session_id?: string; converted?: boolean }): Promise<ParkedThought[]> {
  const params = new URLSearchParams();
  if (filters?.session_id) params.append('session_id', filters.session_id);
  if (filters?.converted !== undefined) params.append('converted', String(filters.converted));
  const qs = params.toString();
  return request<ParkedThought[]>(`/thoughts${qs ? `?${qs}` : ''}`);
}

export async function createThought(data: {
  content: string;
  category?: 'urgent_later' | 'idea' | 'random';
  session_id?: string | null;
}): Promise<ParkedThought> {
  return request<ParkedThought>('/thoughts', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateThought(
  id: string,
  data: Partial<Pick<ParkedThought, 'content' | 'category' | 'converted_to_task'>>
): Promise<ParkedThought> {
  return request<ParkedThought>(`/thoughts/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteThought(id: string): Promise<{ message: string; id: string }> {
  return request<{ message: string; id: string }>(`/thoughts/${id}`, {
    method: 'DELETE',
  });
}

export async function convertThoughtToTask(
  id: string,
  data: { project_id: string; priority?: string; due_date?: string | null }
): Promise<{ task: Task; thought: ParkedThought }> {
  return request<{ task: Task; thought: ParkedThought }>(`/thoughts/${id}/convert-to-task`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// Settings API
export async function getSettings(): Promise<UserSettings> {
  return request<UserSettings>('/settings');
}

export async function updateSettings(data: Partial<UserSettings>): Promise<UserSettings> {
  return request<UserSettings>('/settings', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// Dashboard API
export async function getTodayDashboard(timezone?: string): Promise<TodayDashboardData> {
  const qs = timezone ? `?timezone=${encodeURIComponent(timezone)}` : '';
  return request<TodayDashboardData>(`/dashboard/today${qs}`);
}

export async function getWeeklyDashboard(timezone?: string): Promise<WeeklyDashboardData> {
  const qs = timezone ? `?timezone=${encodeURIComponent(timezone)}` : '';
  return request<WeeklyDashboardData>(`/dashboard/weekly${qs}`);
}
