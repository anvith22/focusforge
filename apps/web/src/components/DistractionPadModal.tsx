import React, { useState, useEffect, useRef } from 'react';
import {
  Brain,
  X,
  Plus,
  Trash2,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Zap,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ParkedThought } from '../types';
import * as api from '../lib/api';

interface DistractionPadModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId?: string | null;
  onTaskCreated?: () => void;
}

export const DistractionPadModal: React.FC<DistractionPadModalProps> = ({
  isOpen,
  onClose,
  sessionId,
  onTaskCreated,
}) => {
  const queryClient = useQueryClient();
  const [inputContent, setInputContent] = useState('');
  const [category, setCategory] = useState<'urgent_later' | 'idea' | 'random'>('idea');
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: thoughts = [], isLoading } = useQuery({
    queryKey: ['parkedThoughts'],
    queryFn: () => api.getThoughts(),
    enabled: isOpen,
  });

  const createThoughtMutation = useMutation({
    mutationFn: (data: { content: string; category: 'urgent_later' | 'idea' | 'random'; session_id?: string | null }) =>
      api.createThought(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parkedThoughts'] });
      setInputContent('');
    },
  });

  const deleteThoughtMutation = useMutation({
    mutationFn: (id: string) => api.deleteThought(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parkedThoughts'] });
    },
  });

  const convertMutation = useMutation({
    mutationFn: async (thought: ParkedThought) => {
      const projects = await api.getProjects();
      const defaultProject = projects[0] || (await api.createProject({ name: 'General Inbox' }));

      return api.convertThoughtToTask(thought.id, {
        project_id: defaultProject.id,
        priority: thought.category === 'urgent_later' ? 'high' : 'medium',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parkedThoughts'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['todayDashboard'] });
      if (onTaskCreated) onTaskCreated();
    },
  });

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputContent.trim()) return;

    createThoughtMutation.mutate({
      content: inputContent.trim(),
      category,
      session_id: sessionId || null,
    });
  };

  const handleConvertToTask = async (thought: ParkedThought) => {
    setConvertingId(thought.id);
    try {
      await convertMutation.mutateAsync(thought);
    } catch (err) {
      console.error('Failed to convert thought to task:', err);
    } finally {
      setConvertingId(null);
    }
  };

  const categoryLabels = {
    urgent_later: { label: '⚡ Urgent Later', badge: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
    idea: { label: '💡 Idea / Spike', badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
    random: { label: '🌀 Random Thought', badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[#0f172a] border border-slate-800 rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden text-slate-200"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Distraction Parking Pad
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
                  Ctrl+J
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Offload intrusive thoughts instantly to PostgreSQL without breaking focus flow.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Input Bar */}
        <form onSubmit={handleAdd} className="p-5 border-b border-slate-800 bg-slate-900/50 space-y-3">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              placeholder="What just popped into your head? (Press Enter to park)"
              value={inputContent}
              onChange={(e) => setInputContent(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-inner"
            />
            <button
              type="submit"
              disabled={!inputContent.trim() || createThoughtMutation.isPending}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Park</span>
            </button>
          </div>

          {/* Category Selector Tabs */}
          <div className="flex items-center gap-2">
            {(['idea', 'urgent_later', 'random'] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
                  category === cat
                    ? 'bg-slate-800 border-slate-600 text-white shadow-xs'
                    : 'bg-slate-950 border-slate-800/80 text-slate-400 hover:text-slate-300'
                }`}
              >
                {categoryLabels[cat].label}
              </button>
            ))}
          </div>
        </form>

        {/* Thought Stream List */}
        <div className="p-5 max-h-80 overflow-y-auto space-y-2.5">
          {isLoading ? (
            <div className="py-8 text-center text-xs text-slate-500">Loading parked thoughts...</div>
          ) : thoughts.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <Sparkles className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-sm font-semibold text-slate-400">Mind is completely clear</p>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Whenever an email, side-quest, or random chore crosses your mind, park it here.
              </p>
            </div>
          ) : (
            thoughts.map((thought) => (
              <div
                key={thought.id}
                className={`p-3 rounded-xl border flex items-start justify-between gap-3 transition ${
                  thought.converted_to_task
                    ? 'bg-slate-950/40 border-slate-800/40 opacity-50'
                    : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                        categoryLabels[thought.category]?.badge || ''
                      }`}
                    >
                      {categoryLabels[thought.category]?.label || thought.category}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(thought.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    {thought.converted_to_task && (
                      <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Converted to Task
                      </span>
                    )}
                  </div>
                  <p
                    className={`text-xs ${
                      thought.converted_to_task ? 'line-through text-slate-500' : 'text-slate-200'
                    }`}
                  >
                    {thought.content}
                  </p>
                </div>

                <div className="flex items-center gap-1 shrink-0 pt-0.5">
                  {!thought.converted_to_task && (
                    <button
                      onClick={() => handleConvertToTask(thought)}
                      disabled={convertingId === thought.id}
                      className="px-2 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-[11px] font-semibold border border-blue-500/20 flex items-center gap-1 transition"
                      title="Promote this parked thought into a project task"
                    >
                      <ArrowRight className="w-3 h-3" />
                      <span>To Task</span>
                    </button>
                  )}
                  <button
                    onClick={() => deleteThoughtMutation.mutate(thought.id)}
                    className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition"
                    title="Dismiss thought"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default DistractionPadModal;
