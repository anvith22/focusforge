import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  CheckSquare,
  Plus,
  Filter,
  Play,
  Calendar,
  X,
  Sparkles,
  Search,
} from 'lucide-react';
import * as api from '../lib/api';
import { Task, TaskPriority, TaskStatus } from '../types';
import TaskCard from '../components/TaskCard';
import CreateTaskModal from '../components/CreateTaskModal';

export const TasksPage: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const selectedProjectId = searchParams.get('project_id') || '';
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [dueDate, setDueDate] = useState('');

  // Fetch projects for dropdown and filter
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.getProjects(),
  });

  // Fetch tasks with search
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks', selectedProjectId, filterStatus, debouncedSearch],
    queryFn: () =>
      api.getTasks({
        project_id: selectedProjectId || undefined,
        status: filterStatus === 'all' ? undefined : filterStatus,
        q: debouncedSearch || undefined,
      }),
  });

  const createTaskMutation = useMutation({
    mutationFn: api.createTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['todayDashboard'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setIsCreateOpen(false);
      setTitle('');
      setDescription('');
      setDueDate('');
    },
  });

  const toggleTaskMutation = useMutation({
    mutationFn: ({ id, currentStatus }: { id: string; currentStatus: string }) => {
      const nextStatus = currentStatus === 'done' ? 'todo' : 'done';
      return api.updateTask(id, { status: nextStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['todayDashboard'] });
      queryClient.invalidateQueries({ queryKey: ['weeklyDashboard'] });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: api.deleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['todayDashboard'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  const handleMoveTask = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= tasks.length) return;
    const reordered = [...tasks];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);

    queryClient.setQueryData(['tasks', selectedProjectId, filterStatus, debouncedSearch], reordered);
    try {
      await api.reorderTasks(reordered.map((t) => t.id));
    } finally {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['todayDashboard'] });
    }
  };

  const handleOpenCreate = () => {
    if (projects.length > 0 && !projectId) {
      setProjectId(selectedProjectId || projects[0].id);
    }
    setIsCreateOpen(true);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !projectId) return;

    createTaskMutation.mutate({
      project_id: projectId,
      title: title.trim(),
      description: description.trim(),
      priority,
      due_date: dueDate || null,
      status: 'todo',
    });
  };

  const nextTask = tasks.find((t) => t.status !== 'done');

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Tasks
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Prioritize and execute project tasks sprint by sprint.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md shadow-blue-500/20 transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Create Task
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search tasks by title or keywords..."
          className="w-full pl-10 pr-9 py-2.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-xs"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Filter and Project Selector Row */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
        {/* Status filters */}
        <div className="flex items-center gap-1.5">
          {['all', 'todo', 'in_progress', 'done'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${
                filterStatus === status
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {status.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Project Selector dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-500">Project:</span>
          <select
            value={selectedProjectId}
            onChange={(e) => {
              if (e.target.value) {
                setSearchParams({ project_id: e.target.value });
              } else {
                setSearchParams({});
              }
            }}
            className="text-xs px-3 py-1.5 rounded-xl border border-slate-300 bg-slate-50 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tasks List */}
      {isLoading ? (
        <div className="py-12 text-center text-xs text-slate-400">Loading tasks...</div>
      ) : tasks.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-dashed border-slate-200 p-8 space-y-3">
          <CheckSquare className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700">No tasks found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {selectedProjectId
              ? 'This project does not have any tasks matching the current filter.'
              : 'Add actionable development tasks to make steady progress.'}
          </p>
          <button
            onClick={handleOpenCreate}
            className="mt-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition"
          >
            Add First Task
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task, index) => (
            <TaskCard
              key={task.id}
              task={task}
              isNextRecommended={nextTask?.id === task.id}
              onToggleComplete={(id, curStatus) =>
                toggleTaskMutation.mutate({ id, currentStatus: curStatus })
              }
              onFocusTask={() => navigate('/')}
              onDelete={(id) => deleteTaskMutation.mutate(id)}
              onMoveUp={() => handleMoveTask(index, 'up')}
              onMoveDown={() => handleMoveTask(index, 'down')}
              canMoveUp={index > 0}
              canMoveDown={index < tasks.length - 1}
            />
          ))}
        </div>
      )}

      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        projects={projects}
        defaultProjectId={selectedProjectId || undefined}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['tasks'] });
          queryClient.invalidateQueries({ queryKey: ['todayDashboard'] });
          queryClient.invalidateQueries({ queryKey: ['projects'] });
        }}
      />
    </div>
  );
};

export default TasksPage;
