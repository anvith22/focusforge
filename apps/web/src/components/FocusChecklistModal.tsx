import React, { useState } from 'react';
import { Smartphone, LayoutGrid, Coffee, Target, Play, X } from 'lucide-react';

interface FocusChecklistModalProps {
  isOpen: boolean;
  plannedMinutes: number;
  taskTitle?: string | null;
  onConfirm: () => void;
  onClose: () => void;
}

export const FocusChecklistModal: React.FC<FocusChecklistModalProps> = ({
  isOpen,
  plannedMinutes,
  taskTitle,
  onConfirm,
  onClose,
}) => {
  const [phoneAway, setPhoneAway] = useState(false);
  const [tabsClosed, setTabsClosed] = useState(false);
  const [waterReady, setWaterReady] = useState(false);
  const [singleTaskCommitted, setSingleTaskCommitted] = useState(false);

  if (!isOpen) return null;

  const allChecked = phoneAway && tabsClosed && singleTaskCommitted;

  const handleStart = () => {
    onConfirm();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
        <div className="bg-slate-900 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-600/30 text-blue-400">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">Pre-Flight Focus Checklist</h3>
              <p className="text-xs text-slate-400">Setting up for a distraction-free {plannedMinutes}m sprint</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-3.5">
          {taskTitle && (
            <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl text-xs text-blue-900 mb-2">
              <span className="font-semibold">Current objective:</span> {taskTitle}
            </div>
          )}

          <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition select-none">
            <input
              type="checkbox"
              checked={phoneAway}
              onChange={(e) => setPhoneAway(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <Smartphone className="w-4 h-4 text-slate-500" />
                Phone Put Away
              </div>
              <p className="text-xs text-slate-500">Placed in another room or set to Do Not Disturb</p>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition select-none">
            <input
              type="checkbox"
              checked={tabsClosed}
              onChange={(e) => setTabsClosed(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <LayoutGrid className="w-4 h-4 text-slate-500" />
                Tabs & Notifications Closed
              </div>
              <p className="text-xs text-slate-500">Muted Slack, closed Twitter/YouTube/Reddit</p>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition select-none">
            <input
              type="checkbox"
              checked={singleTaskCommitted}
              onChange={(e) => setSingleTaskCommitted(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <Target className="w-4 h-4 text-slate-500" />
                Single-Task Commitment
              </div>
              <p className="text-xs text-slate-500">I will not switch tasks until the timer finishes</p>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition select-none">
            <input
              type="checkbox"
              checked={waterReady}
              onChange={(e) => setWaterReady(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <Coffee className="w-4 h-4 text-slate-500" />
                Water / Drink Ready
              </div>
              <p className="text-xs text-slate-500">Everything needed is at hand</p>
            </div>
          </label>

          <div className="pt-3 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleStart}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 transition flex items-center gap-2"
            >
              <Play className="w-4 h-4 fill-current" />
              {allChecked ? 'Ready! Launch Focus' : 'Launch Focus'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FocusChecklistModal;
