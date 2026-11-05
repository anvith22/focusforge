import React, { useState } from 'react';
import {
  CheckCircle2,
  Circle,
  Clock,
  Calendar,
  Play,
  Trash2,
  FolderKanban,
  CheckSquare,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Plus,
  Loader2,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Task, TaskSubtask, SubtaskSuggestion } from '../types';
import * as api from '../lib/api';
import { renderMarkdownLite } from '../lib/markdownLite';

interface TaskCardProps {
  task: Task;
  onToggleComplete: (id: string, currentStatus: string) => void;
  onFocusTask?: (taskId: string, minutes?: number) => void;
  onDelete?: (id: string) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  isNextRecommended?: boolean;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onToggleComplete,
  onFocusTask,
  onDelete,
  onMoveUp,
  onMoveDown,
  canMoveUp = false,
  canMoveDown = false,
  isNextRecommended = false,
}) => {
  const queryClient = useQueryClient();
  const isDone = task.status === 'done';
  const [showSubtasks, setShowSubtasks] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<SubtaskSuggestion[]>([]);

  // Subtasks query
  const { data: subtasks = [] } = useQuery({
    queryKey: ['taskSubtasks', task.id],
    queryFn: () => api.getSubtasks(task.id),
    enabled: showSubtasks,
  });

  const createSubtaskMutation = useMutation({
    mutationFn: (title: string) => api.createSubtask(task.id, title),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskSubtasks', task.id] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['todayDashboard'] });
      setNewSubtaskTitle('');
    },
  });

  const toggleSubtaskMutation = useMutation({
    mutationFn: ({ subtaskId, completed }: { subtaskId: string; completed: boolean }) =>
      api.updateSubtask(task.id, subtaskId, { completed }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskSubtasks', task.id] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['todayDashboard'] });
    },
  });

  const deleteSubtaskMutation = useMutation({
    mutationFn: (subtaskId: string) => api.deleteSubtask(task.id, subtaskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskSubtasks', task.id] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['todayDashboard'] });
    },
  });

  const handleAddSubtask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim()) return;
    createSubtaskMutation.mutate(newSubtaskTitle.trim());
  };

  const handleAiBreakdown = async () => {
    setIsAiLoading(true);
    setShowSubtasks(true);
    try {
      const res = await api.breakDownTaskWithAI(task.id);
      setAiSuggestions(res.suggestions);
    } catch (err) {
      console.error('Failed to break down task:', err);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleAcceptSuggestion = (sug: SubtaskSuggestion) => {
    createSubtaskMutation.mutate(sug.title);
    setAiSuggestions((prev) => prev.filter((s) => s.title !== sug.title));
  };

  const priorityColors = {
    high: 'bg-rose-50 text-rose-700 border-rose-200',
    medium: 'bg-amber-50 text-amber-700 border-amber-200',
    low: 'bg-slate-100 text-slate-600 border-slate-200',
  };

  const totalSubtasks = task.subtasks_count ?? subtasks.length;
  const completedSubtasks = task.subtasks_completed_count ?? subtasks.filter((s) => s.completed).length;

  return (
    <div
      className={`group relative p-4 rounded-2xl border transition-all duration-200 ${
        isDone
          ? 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-75'
          : isNextRecommended
          ? 'bg-white dark:bg-slate-900 border-blue-500 shadow-md shadow-blue-500/10 ring-1 ring-blue-500/30'
          : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm'
      }`}
    >
      {isNextRecommended && !isDone && (
        <div className="absolute -top-2.5 left-4 px-2.5 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-bold tracking-wider uppercase shadow-sm">
          Next Priority
        </div>
      )}

      <div className="flex items-start gap-3.5">
        {/* Toggle checkbox */}
        <button
          type="button"
          onClick={() => onToggleComplete(task.id, task.status)}
          className="mt-0.5 text-slate-400 hover:text-blue-600 transition shrink-0"
          title={isDone ? 'Mark as incomplete' : 'Mark as done'}
        >
          {isDone ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-50 dark:fill-emerald-950/40" />
          ) : (
            <Circle className="w-5 h-5" />
          )}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4
              className={`text-sm font-semibold truncate ${
                isDone ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'
              }`}
            >
              {task.title}
            </h4>
          </div>

          {task.description && (
            <div className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-2 leading-relaxed">
              {renderMarkdownLite(task.description)}
            </div>
          )}

          {/* Badges / Metadata */}
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
            {task.project_name && (
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium">
                {task.project_color ? (
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: task.project_color }}
                  />
                ) : (
                  <FolderKanban className="w-3 h-3 text-slate-400" />
                )}
                {task.project_name}
              </span>
            )}

            <span
              className={`px-2 py-0.5 rounded-md border font-semibold uppercase tracking-wider text-[10px] ${
                priorityColors[task.priority] || priorityColors.medium
              }`}
            >
              {task.priority}
            </span>

            {/* Target Sprint Duration Badge */}
            <span
              className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-semibold border border-blue-200/60 text-[10px]"
              title="Configured Sprint Duration"
            >
              <Clock className="w-3 h-3 text-blue-500" />
              {task.estimated_minutes || 25}m
            </span>

            {task.due_date && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px]">
                <Calendar className="w-3 h-3 text-slate-400" />
                {new Date(task.due_date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            )}

            {task.recurrence && task.recurrence !== 'none' && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200/60 text-[10px]">
                {task.recurrence === 'weekly' && '🗓️ All Week'}
                {task.recurrence === 'daily' && '🔁 Daily'}
                {task.recurrence === 'weekdays' && '🏢 Mon-Fri'}
                {task.recurrence === 'persistent' && '♾️ Ongoing'}
              </span>
            )}

            {/* Subtasks Badge Trigger */}
            <button
              onClick={() => setShowSubtasks(!showSubtasks)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border transition ${
                showSubtasks
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <CheckSquare className="w-3 h-3" />
              <span>
                {completedSubtasks}/{totalSubtasks || 0} subtasks
              </span>
              {showSubtasks ? (
                <ChevronUp className="w-3 h-3 text-slate-400" />
              ) : (
                <ChevronDown className="w-3 h-3 text-slate-400" />
              )}
            </button>

            {/* AI Breakdown Button */}
            {!isDone && (
              <button
                onClick={handleAiBreakdown}
                disabled={isAiLoading}
                className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 border border-indigo-200/70 hover:from-indigo-100 hover:to-purple-100 text-[10px] font-semibold transition"
                title="Deconstruct task into 15-minute chunks"
              >
                {isAiLoading ? (
                  <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />
                ) : (
                  <Sparkles className="w-3 h-3 text-indigo-600" />
                )}
                <span>Break Down</span>
              </button>
            )}

            {isDone && task.completed_at && (
              <span className="text-[10px] text-emerald-600 font-medium">Completed</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100 transition">
          {/* Priority Reordering Controls */}
          {onMoveUp && (
            <button
              type="button"
              disabled={!canMoveUp}
              onClick={onMoveUp}
              className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-20 disabled:hover:bg-transparent transition"
              title="Move up in priority"
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
          )}

          {onMoveDown && (
            <button
              type="button"
              disabled={!canMoveDown}
              onClick={onMoveDown}
              className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-20 disabled:hover:bg-transparent transition"
              title="Move down in priority"
            >
              <ArrowDown className="w-3.5 h-3.5" />
            </button>
          )}

          {!isDone && onFocusTask && (
            <button
              type="button"
              onClick={() => onFocusTask(task.id, task.estimated_minutes || 25)}
              className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-600 hover:text-white transition"
              title={`Launch ${task.estimated_minutes || 25}m focus sprint for this task`}
            >
              <Play className="w-4 h-4 fill-current" />
            </button>
          )}

          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(task.id)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
              title="Delete task"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Expandable Subtasks Checklist & AI Suggestions */}
      {showSubtasks && (
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3 animate-in fade-in duration-150">
          {/* Full Task Notes with Markdown Preview */}
          {task.description && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 rounded-xl space-y-1 text-xs">
              <span className="font-bold uppercase tracking-wider text-[10px] text-slate-400 block">
                Task Specification & Notes
              </span>
              <div className="text-slate-700 dark:text-slate-300 leading-relaxed">
                {renderMarkdownLite(task.description)}
              </div>
            </div>
          )}

          {/* AI Suggestions Box (if generated) */}
          {aiSuggestions.length > 0 && (
            <div className="p-3 bg-gradient-to-r from-indigo-50/80 to-purple-50/80 border border-indigo-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-indigo-950">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  Recommended Action Steps:
                </span>
                <span className="text-[10px] text-indigo-500 font-normal">Click to add step</span>
              </div>
              <div className="space-y-1.5">
                {aiSuggestions.map((sug, i) => (
                  <div
                    key={i}
                    onClick={() => handleAcceptSuggestion(sug)}
                    className="p-2 rounded-lg bg-white/90 border border-indigo-100 hover:border-indigo-300 hover:shadow-xs cursor-pointer text-xs flex items-center justify-between transition group/sug"
                  >
                    <div>
                      <div className="font-medium text-slate-800">{sug.title}</div>
                      {sug.tip && <div className="text-[10px] text-slate-500 mt-0.5">{sug.tip}</div>}
                    </div>
                    <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200 group-hover/sug:bg-indigo-600 group-hover/sug:text-white transition">
                      +{sug.estimated_minutes}m
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Subtasks List */}
          <div className="space-y-1.5">
            {subtasks.map((subtask) => (
              <div
                key={subtask.id}
                className="flex items-center justify-between py-1 px-2 rounded-lg hover:bg-slate-50 group/sub"
              >
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer flex-1">
                  <input
                    type="checkbox"
                    checked={subtask.completed}
                    onChange={(e) =>
                      toggleSubtaskMutation.mutate({
                        subtaskId: subtask.id,
                        completed: e.target.checked,
                      })
                    }
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span className={subtask.completed ? 'line-through text-slate-400' : ''}>
                    {subtask.title}
                  </span>
                </label>
                <button
                  onClick={() => deleteSubtaskMutation.mutate(subtask.id)}
                  className="opacity-0 group-hover/sub:opacity-100 text-slate-300 hover:text-rose-500 transition p-0.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Add Subtask Input */}
          <form onSubmit={handleAddSubtask} className="flex items-center gap-2 pt-1">
            <input
              type="text"
              placeholder="Add micro-step (e.g. Write test case, inspect logs)..."
              value={newSubtaskTitle}
              onChange={(e) => setNewSubtaskTitle(e.target.value)}
              className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={!newSubtaskTitle.trim() || createSubtaskMutation.isPending}
              className="px-2.5 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 disabled:opacity-40 transition"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default TaskCard;
