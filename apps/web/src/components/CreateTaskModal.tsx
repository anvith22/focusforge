import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Calendar,
  Sparkles,
  Repeat,
  CheckCircle2,
  FolderKanban,
  Flag,
  Clock,
} from 'lucide-react';
import { Project, TaskPriority } from '../types';
import * as api from '../lib/api';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  defaultProjectId?: string;
  onSuccess: () => void;
}

type ScheduleOption = 'today' | 'weekly' | 'weekdays' | 'persistent' | 'custom';

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  isOpen,
  onClose,
  projects,
  defaultProjectId,
  onSuccess,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [estimatedMinutes, setEstimatedMinutes] = useState<number>(25);
  const [isCustomMinutes, setIsCustomMinutes] = useState<boolean>(false);
  const [schedule, setSchedule] = useState<ScheduleOption>('weekly'); // Default to weekly as requested!
  const [customDueDate, setCustomDueDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setDescription('');
      setPriority('medium');
      setSchedule('weekly');
      setCustomDueDate('');
      setError(null);
      if (defaultProjectId) {
        setProjectId(defaultProjectId);
      } else if (projects.length > 0) {
        setProjectId(projects[0].id);
      }
    }
  }, [isOpen, defaultProjectId, projects]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please enter a task title');
      return;
    }

    let targetProjectId = projectId;
    if (!targetProjectId) {
      if (projects.length > 0) {
        targetProjectId = projects[0].id;
      } else {
        // Create default project if none exists
        try {
          const newProj = await api.createProject({ name: 'General Focus' });
          targetProjectId = newProj.id;
        } catch {
          setError('Please create or select a project first.');
          return;
        }
      }
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const today = new Date();
      let calculatedDueDate: string | null = null;
      let recurrenceType: 'none' | 'daily' | 'weekly' | 'weekdays' | 'persistent' = 'none';

      if (schedule === 'today') {
        calculatedDueDate = today.toISOString().slice(0, 10);
        recurrenceType = 'none';
      } else if (schedule === 'weekly') {
        // Keep active for 7 days
        const weekLater = new Date();
        weekLater.setDate(today.getDate() + 7);
        calculatedDueDate = weekLater.toISOString().slice(0, 10);
        recurrenceType = 'weekly';
      } else if (schedule === 'weekdays') {
        const weekLater = new Date();
        weekLater.setDate(today.getDate() + 5);
        calculatedDueDate = weekLater.toISOString().slice(0, 10);
        recurrenceType = 'weekdays';
      } else if (schedule === 'persistent') {
        calculatedDueDate = null;
        recurrenceType = 'persistent';
      } else if (schedule === 'custom') {
        calculatedDueDate = customDueDate || null;
        recurrenceType = 'none';
      }

      await api.createTask({
        project_id: targetProjectId,
        title: title.trim(),
        description: description.trim(),
        priority,
        estimated_minutes: estimatedMinutes,
        recurrence: recurrenceType,
        due_date: calculatedDueDate,
        status: 'todo',
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to create task');
    } finally {
      setIsSubmitting(false);
    }
  };

  const scheduleOptions: { id: ScheduleOption; title: string; desc: string; badge: string }[] = [
    {
      id: 'weekly',
      title: '🗓️ Keep for Entire Week (7 Days)',
      desc: 'Active all week in your queue so you never have to re-add it daily.',
      badge: 'Recommended',
    },
    {
      id: 'today',
      title: '☀️ Today Only',
      desc: 'Single-session action for tonight.',
      badge: 'Single Day',
    },
    {
      id: 'weekdays',
      title: '🏢 Mon - Fri (Workdays)',
      desc: 'Persists across all weekdays.',
      badge: '5 Days',
    },
    {
      id: 'persistent',
      title: '♾️ Continuous / Evergreen',
      desc: 'Always in your queue until you explicitly check it off or archive.',
      badge: 'Ongoing',
    },
    {
      id: 'custom',
      title: '📅 Specific Due Date',
      desc: 'Choose a custom calendar deadline.',
      badge: 'Custom',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">Add New Focus Task</h3>
              <p className="text-xs text-slate-500">Configure task schedule and persistence</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Task Title *
            </label>
            <input
              type="text"
              required
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Build authentication endpoints, LeetCode sprint..."
              className="w-full text-sm px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            />
          </div>

          {/* Project & Priority Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
                <FolderKanban className="w-3.5 h-3.5 text-slate-400" />
                Project
              </label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
                <Flag className="w-3.5 h-3.5 text-slate-400" />
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="high">🔴 High Priority</option>
                <option value="medium">🟡 Medium Priority</option>
                <option value="low">⚪ Low Priority</option>
              </select>
            </div>
          </div>

          {/* Sprint Duration / Time Selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                Target Focus Sprint Duration
              </label>
              <span className="text-[11px] text-slate-400 font-medium">
                Auto-sets timer when launched
              </span>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
              {[15, 25, 45, 60].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => {
                    setEstimatedMinutes(mins);
                    setIsCustomMinutes(false);
                  }}
                  className={`py-2 px-2.5 rounded-xl text-xs font-semibold border transition text-center ${
                    !isCustomMinutes && estimatedMinutes === mins
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {mins} min
                  {mins === 25 && <span className="block text-[9px] font-normal opacity-90">Pomodoro</span>}
                  {mins === 15 && <span className="block text-[9px] font-normal opacity-90">Quick</span>}
                  {mins === 45 && <span className="block text-[9px] font-normal opacity-90">Deep</span>}
                  {mins === 60 && <span className="block text-[9px] font-normal opacity-90">Extended</span>}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setIsCustomMinutes(true)}
                className={`py-2 px-2.5 rounded-xl text-xs font-semibold border transition text-center ${
                  isCustomMinutes
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Custom
                <span className="block text-[9px] font-normal opacity-90">Custom</span>
              </button>
            </div>

            {isCustomMinutes && (
              <div className="mt-2.5 flex items-center gap-2">
                <input
                  type="number"
                  min="5"
                  max="180"
                  value={estimatedMinutes}
                  onChange={(e) =>
                    setEstimatedMinutes(Math.max(5, Math.min(180, parseInt(e.target.value) || 25)))
                  }
                  className="w-24 text-xs px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
                <span className="text-xs text-slate-500 font-medium">minutes per focus sprint</span>
              </div>
            )}
          </div>

          {/* Schedule / Persistence Options (Keep for a week, etc.) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Repeat className="w-3.5 h-3.5 text-blue-600" />
                Task Persistence / Recurrence
              </label>
              <span className="text-[11px] text-blue-600 font-semibold">
                No daily re-entry needed
              </span>
            </div>

            <div className="space-y-2">
              {scheduleOptions.map((opt) => {
                const isSelected = schedule === opt.id;
                return (
                  <div
                    key={opt.id}
                    onClick={() => setSchedule(opt.id)}
                    className={`p-3 rounded-2xl border cursor-pointer transition flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-blue-50/70 border-blue-500 ring-1 ring-blue-500/30'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{opt.title}</span>
                        {opt.badge && (
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                              isSelected
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {opt.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 leading-tight">{opt.desc}</p>
                    </div>

                    <div
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        isSelected ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
                      }`}
                    >
                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Custom due date picker if selected */}
            {schedule === 'custom' && (
              <div className="mt-3 pt-3 border-t border-slate-100">
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Select Custom Due Date:
                </label>
                <input
                  type="date"
                  value={customDueDate}
                  onChange={(e) => setCustomDueDate(e.target.value)}
                  className="w-full text-xs px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>

          {/* Description (Optional) */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add key notes, links, or acceptance criteria..."
              className="w-full text-xs px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 shadow-md shadow-blue-500/20 transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              {isSubmitting ? 'Creating...' : 'Add to Focus Queue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTaskModal;
