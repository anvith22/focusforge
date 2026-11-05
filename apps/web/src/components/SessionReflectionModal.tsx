import React, { useState, useEffect } from 'react';
import { Sparkles, CheckCircle2, ArrowRight, X, Brain } from 'lucide-react';
import { ParkedThought } from '../types';
import { getParkedThoughts } from '../lib/parkedThoughts';

interface SessionReflectionModalProps {
  isOpen: boolean;
  actualSeconds: number;
  plannedMinutes: number;
  taskTitle?: string | null;
  firstIncompleteSubtask?: string | null;
  onConfirm: (reflection: {
    accomplishment: string;
    blockers: string;
    next_action: string;
  }) => Promise<void>;
  onClose: () => void;
}

export const SessionReflectionModal: React.FC<SessionReflectionModalProps> = ({
  isOpen,
  actualSeconds,
  plannedMinutes,
  taskTitle,
  firstIncompleteSubtask,
  onConfirm,
  onClose,
}) => {
  const [accomplishment, setAccomplishment] = useState('');
  const [blockers, setBlockers] = useState('');
  const [nextAction, setNextAction] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [parkedThoughts, setParkedThoughts] = useState<ParkedThought[]>([]);

  useEffect(() => {
    if (isOpen) {
      setParkedThoughts(getParkedThoughts().slice(0, 3));
      if (firstIncompleteSubtask) {
        setNextAction(firstIncompleteSubtask);
      }
    }
  }, [isOpen, firstIncompleteSubtask]);

  if (!isOpen) return null;

  const actualMinutes = Math.round(actualSeconds / 60);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onConfirm({
        accomplishment: accomplishment.trim(),
        blockers: blockers.trim(),
        next_action: nextAction.trim(),
      });
      setAccomplishment('');
      setBlockers('');
      setNextAction('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/20 backdrop-blur-md">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Focus Session Completed!</h3>
              <p className="text-xs text-blue-100">
                You focused for {actualMinutes} min (Planned: {plannedMinutes} min)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {taskTitle && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
              <span className="font-semibold text-slate-800">Task worked on:</span> {taskTitle}
            </div>
          )}

          {parkedThoughts.length > 0 && (
            <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-200/60 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900">
                <Brain className="w-3.5 h-3.5 text-indigo-600" />
                Thoughts Parked During This Sprint:
              </div>
              <ul className="text-xs text-indigo-800 space-y-1 pl-4 list-disc">
                {parkedThoughts.map((t) => (
                  <li key={t.id} className="truncate">
                    {t.content}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              What did you accomplish?
            </label>
            <textarea
              required
              rows={2}
              value={accomplishment}
              onChange={(e) => setAccomplishment(e.target.value)}
              placeholder="e.g., Completed API tests, refactored timer hook..."
              className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Any blockers or friction? (Optional)
            </label>
            <input
              type="text"
              value={blockers}
              onChange={(e) => setBlockers(e.target.value)}
              placeholder="e.g., Got briefly distracted by messages..."
              className="w-full text-sm px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
              <ArrowRight className="w-3.5 h-3.5 text-emerald-600" />
              What is your next concrete action?
            </label>
            <input
              type="text"
              value={nextAction}
              onChange={(e) => setNextAction(e.target.value)}
              placeholder="e.g., Wire up Settings page and add unit tests"
              className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition"
            >
              Skip Reflection
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !accomplishment.trim()}
              className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 shadow-md shadow-blue-500/20 transition flex items-center gap-2"
            >
              {isSubmitting ? 'Saving...' : 'Record Session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SessionReflectionModal;
