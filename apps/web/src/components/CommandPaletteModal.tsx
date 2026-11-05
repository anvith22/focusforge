import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  Command,
  Flame,
  FolderKanban,
  CheckSquare,
  History,
  BarChart3,
  Settings,
  Play,
  Maximize2,
  Wind,
  Brain,
  Plus,
  ArrowRight,
  Zap,
  Headphones,
  Waves,
  Radio,
  VolumeX,
} from 'lucide-react';
import soundEngine from '../lib/soundEngine';
import * as api from '../lib/api';

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartSprint?: (minutes: number) => void;
  onOpenDistractionPad?: () => void;
  onOpenBreathingBreak?: () => void;
  onToggleZenMode?: () => void;
  isTimerActive?: boolean;
}

interface CommandItem {
  id: string;
  title: string;
  subtitle: string;
  category: 'Navigation' | 'Focus Timer' | 'Mindfulness' | 'Tasks';
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  onStartSprint,
  onOpenDistractionPad,
  onOpenBreathingBreak,
  onToggleZenMode,
  isTimerActive,
}) => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: searchedTasks = [] } = useQuery({
    queryKey: ['paletteTasks', search],
    queryFn: () => api.getTasks({ q: search.trim() }),
    enabled: isOpen && search.trim().length >= 2,
    staleTime: 5000,
  });

  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const commands: CommandItem[] = [
    // Focus actions
    {
      id: 'sprint-25',
      title: 'Start 25m Focus Sprint',
      subtitle: 'Standard Pomodoro sprint for rapid execution',
      category: 'Focus Timer',
      icon: Play,
      action: () => {
        onClose();
        if (onStartSprint) onStartSprint(25);
      },
    },
    {
      id: 'sprint-50',
      title: 'Start 50m Deep Work Block',
      subtitle: 'Ultradian block for complex coding and architecture',
      category: 'Focus Timer',
      icon: Zap,
      action: () => {
        onClose();
        if (onStartSprint) onStartSprint(50);
      },
    },
    {
      id: 'zen-mode',
      title: 'Toggle Zen Mode',
      subtitle: 'Distraction-free fullscreen sprint view',
      category: 'Focus Timer',
      icon: Maximize2,
      action: () => {
        onClose();
        if (onToggleZenMode) onToggleZenMode();
      },
    },
    {
      id: 'distraction-pad',
      title: 'Open Distraction Pad (Ctrl+J)',
      subtitle: 'Park intrusive thoughts without breaking flow',
      category: 'Focus Timer',
      icon: Brain,
      action: () => {
        onClose();
        if (onOpenDistractionPad) onOpenDistractionPad();
      },
    },
    {
      id: 'box-breathing',
      title: 'Box Breathing & Recovery Break',
      subtitle: '4-4-4-4 guided breathing exercise (5 mins)',
      category: 'Mindfulness',
      icon: Wind,
      action: () => {
        onClose();
        if (onOpenBreathingBreak) onOpenBreathingBreak();
      },
    },
    // Audio Soundscapes
    {
      id: 'audio-pink',
      title: 'Play Pink Noise',
      subtitle: 'Steady balanced 1/f masking for continuous focus',
      category: 'Mindfulness',
      icon: Waves,
      action: () => {
        onClose();
        soundEngine.playAmbient('pink_noise');
      },
    },
    {
      id: 'audio-brown',
      title: 'Play Brown Noise',
      subtitle: 'Warm deep waterfall rumble for blocking background chatter',
      category: 'Mindfulness',
      icon: Radio,
      action: () => {
        onClose();
        soundEngine.playAmbient('brown_noise');
      },
    },
    {
      id: 'audio-binaural-alpha',
      title: 'Play Binaural Alpha (14Hz)',
      subtitle: 'Binaural carrier wave for relaxed flow and creativity',
      category: 'Mindfulness',
      icon: Headphones,
      action: () => {
        onClose();
        soundEngine.playAmbient('binaural_alpha');
      },
    },
    {
      id: 'audio-binaural-gamma',
      title: 'Play Binaural Gamma (40Hz)',
      subtitle: 'High-intensity carrier wave for deep problem-solving',
      category: 'Mindfulness',
      icon: Zap,
      action: () => {
        onClose();
        soundEngine.playAmbient('binaural_gamma');
      },
    },
    {
      id: 'audio-mute',
      title: 'Mute / Stop Soundscape',
      subtitle: 'Silence all synthesized ambient background audio',
      category: 'Mindfulness',
      icon: VolumeX,
      action: () => {
        onClose();
        soundEngine.stopAmbient();
      },
    },
    // Navigation
    {
      id: 'nav-today',
      title: 'Go to Today',
      subtitle: 'Hero sprint launcher & daily task queue',
      category: 'Navigation',
      icon: Flame,
      action: () => {
        onClose();
        navigate('/');
      },
    },
    {
      id: 'nav-tasks',
      title: 'Go to Tasks',
      subtitle: 'Manage backlog, active, and completed items',
      category: 'Navigation',
      icon: CheckSquare,
      action: () => {
        onClose();
        navigate('/tasks');
      },
    },
    {
      id: 'nav-projects',
      title: 'Go to Projects',
      subtitle: 'View side projects, status and task progress',
      category: 'Navigation',
      icon: FolderKanban,
      action: () => {
        onClose();
        navigate('/projects');
      },
    },
    {
      id: 'nav-progress',
      title: 'Go to Progress & Heatmap',
      subtitle: 'Review consistency streaks, charts, and metrics',
      category: 'Navigation',
      icon: BarChart3,
      action: () => {
        onClose();
        navigate('/progress');
      },
    },
    {
      id: 'nav-history',
      title: 'Go to Focus History',
      subtitle: 'Detailed log of completed focus sessions',
      category: 'Navigation',
      icon: History,
      action: () => {
        onClose();
        navigate('/history');
      },
    },
    {
      id: 'nav-settings',
      title: 'Go to Settings',
      subtitle: 'Timer defaults, daily target, and PostgreSQL diagnostics',
      category: 'Navigation',
      icon: Settings,
      action: () => {
        onClose();
        navigate('/settings');
      },
    },
  ];

  const staticFiltered = commands.filter((cmd) => {
    const q = search.toLowerCase();
    return (
      cmd.title.toLowerCase().includes(q) ||
      cmd.subtitle.toLowerCase().includes(q) ||
      cmd.category.toLowerCase().includes(q)
    );
  });

  const taskCommands: CommandItem[] = (searchedTasks || []).slice(0, 6).map((task) => ({
    id: `task-${task.id}`,
    title: task.title,
    subtitle: `${task.project_name || 'No project'} • ${task.priority} priority • ${task.status}`,
    category: 'Tasks',
    icon: CheckSquare,
    action: () => {
      onClose();
      navigate(`/tasks?project_id=${task.project_id}`);
    },
  }));

  const filtered = search.trim().length >= 2 ? [...staticFiltered, ...taskCommands] : staticFiltered;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filtered.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % (filtered.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].action();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-[#0f172a] text-slate-100 rounded-2xl border border-slate-700/80 shadow-2xl overflow-hidden flex flex-col max-h-[75vh] animate-in zoom-in-95 duration-100"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-800 bg-slate-900/60 gap-3">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a command or jump to page... (or use ↑ ↓ and Enter)"
            className="w-full bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-mono text-slate-400">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              No matching commands found.
            </div>
          ) : (
            filtered.map((cmd, idx) => {
              const Icon = cmd.icon;
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={cmd.id}
                  onClick={cmd.action}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition ${
                    isSelected
                      ? 'bg-blue-600/20 border border-blue-500/40 text-white'
                      : 'hover:bg-slate-800/60 text-slate-300 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white truncate">
                        {cmd.title}
                      </div>
                      <div className="text-xs text-slate-400 truncate">{cmd.subtitle}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-medium tracking-wider uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                      {cmd.category}
                    </span>
                    {isSelected && (
                      <ArrowRight className="w-4 h-4 text-blue-400 animate-pulse hidden sm:block" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts hint */}
        <div className="px-4 py-2.5 border-t border-slate-800/80 bg-slate-900/40 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-3">
            <span>↑ ↓ to navigate</span>
            <span>↵ to select</span>
            <span>esc to close</span>
          </div>
          <span className="text-indigo-400 font-medium">FocusForge Command OS</span>
        </div>
      </div>
    </div>
  );
};
export default CommandPaletteModal;
