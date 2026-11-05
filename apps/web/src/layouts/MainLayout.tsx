import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Flame,
  CheckSquare,
  FolderKanban,
  History,
  BarChart3,
  Settings,
  Menu,
  X,
  Zap,
  Clock,
  Sparkles,
  Search,
  Brain,
  Wind,
  Sun,
  Moon,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getActiveSession } from '../lib/api';
import CommandPaletteModal from '../components/CommandPaletteModal';
import DistractionPadModal from '../components/DistractionPadModal';
import BreathingBreakModal from '../components/BreathingBreakModal';

export const MainLayout: React.FC = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isDistractionPadOpen, setIsDistractionPadOpen] = useState(false);
  const [isBreathingOpen, setIsBreathingOpen] = useState(false);
  const [isShortcutsHelpOpen, setIsShortcutsHelpOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('focusforge_theme') === 'dark';
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('focusforge_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('focusforge_theme', 'light');
    }
  }, [isDarkMode]);

  // Global Keyboard shortcuts & Modal Event Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      const isInput = activeTag === 'input' || activeTag === 'textarea';

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        setIsDistractionPadOpen((prev) => !prev);
      } else if (e.key === '?' && !e.ctrlKey && !e.metaKey && !isInput) {
        e.preventDefault();
        setIsShortcutsHelpOpen((prev) => !prev);
      }
    };

    const handleOpenDistraction = () => setIsDistractionPadOpen(true);
    const handleOpenBreathing = () => setIsBreathingOpen(true);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('focusforge-open-distraction-pad', handleOpenDistraction);
    window.addEventListener('focusforge-open-breathing-break', handleOpenBreathing);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('focusforge-open-distraction-pad', handleOpenDistraction);
      window.removeEventListener('focusforge-open-breathing-break', handleOpenBreathing);
    };
  }, []);

  const { data: activeSession } = useQuery({
    queryKey: ['activeSession'],
    queryFn: getActiveSession,
    refetchInterval: 5000,
  });

  const navItems = [
    { to: '/', label: 'Today', icon: Flame, badge: activeSession ? 'ACTIVE' : null },
    { to: '/projects', label: 'Projects', icon: FolderKanban },
    { to: '/tasks', label: 'Tasks', icon: CheckSquare },
    { to: '/history', label: 'Focus History', icon: History },
    { to: '/progress', label: 'Progress & Stats', icon: BarChart3 },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-[#070b14] text-slate-800 dark:text-slate-100 antialiased overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-[#0a0f1d] border-r border-slate-800 text-slate-300 select-none">
        {/* Brand Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-md shadow-blue-500/20 text-white font-bold">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight text-white block">FocusForge</span>
              <span className="text-[11px] text-slate-400 font-medium tracking-wider uppercase">Deep Work OS</span>
            </div>
          </div>
        </div>

        {/* Quick Command Trigger */}
        <div className="px-4 pt-3 pb-1">
          <button
            onClick={() => setIsCommandPaletteOpen(true)}
            className="w-full px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 flex items-center justify-between text-xs text-slate-400 hover:text-slate-200 transition group shadow-inner"
          >
            <span className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-slate-500 group-hover:text-blue-400 transition" />
              <span>Commands...</span>
            </span>
            <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-mono text-slate-400 group-hover:text-slate-300">
              Ctrl+K
            </kbd>
          </button>
        </div>

        {/* Active Timer Indicator Pill */}
        {activeSession && (
          <div className="mx-4 my-2 p-3 bg-blue-950/60 border border-blue-500/30 rounded-xl">
            <div className="flex items-center justify-between text-xs text-blue-400 font-semibold mb-1">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                Session Active
              </span>
              <span>{activeSession.planned_minutes}m</span>
            </div>
            <p className="text-xs text-slate-300 font-medium truncate">
              {activeSession.task_title || 'Unscheduled Focus'}
            </p>
          </div>
        )}

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30 font-semibold'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                }`
              }
            >
              <div className="flex items-center gap-3">
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-amber-400/20 text-amber-300 uppercase">
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Evening Routine Prompt Card */}
        <div className="p-4 m-3 bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800/80 rounded-xl text-xs text-slate-400">
          <div className="flex items-center gap-1.5 font-semibold text-slate-200 mb-1">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>Evening Principle</span>
          </div>
          <p className="text-[11px] leading-relaxed text-slate-400">
            One concrete action per evening beats weekend marathons. Start with 10 or 25 minutes.
          </p>
        </div>

        {/* User Info / Version / Theme Toggle */}
        <div className="px-5 py-3.5 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Postgres</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsDarkMode((prev) => !prev)}
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-amber-400 transition"
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDarkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
            <span className="font-mono text-[10px]">v1.0</span>
          </div>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-[#0a0f1d] border-b border-slate-800 flex items-center justify-between px-4 z-40 text-white">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-blue-500 fill-current" />
          <span className="font-bold text-base">FocusForge</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsDarkMode((prev) => !prev)}
            className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-amber-400 transition"
            title="Toggle Theme"
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-16 bg-[#0a0f1d] z-30 flex flex-col p-4 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium ${
                  isActive ? 'bg-blue-600 text-white font-semibold' : 'text-slate-300 hover:bg-slate-800'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-y-auto pt-16 md:pt-0 bg-slate-50 dark:bg-[#070b14] text-slate-900 dark:text-slate-100 transition-colors duration-150">
        <Outlet />
      </main>

      {/* Global Command Palette (Ctrl+K) */}
      <CommandPaletteModal
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onOpenDistractionPad={() => setIsDistractionPadOpen(true)}
        onOpenBreathingBreak={() => setIsBreathingOpen(true)}
        isTimerActive={Boolean(activeSession)}
      />

      {/* Global Distraction Pad (Ctrl+J) */}
      <DistractionPadModal
        isOpen={isDistractionPadOpen}
        onClose={() => setIsDistractionPadOpen(false)}
        sessionId={activeSession?.id}
      />

      {/* Guided Box Breathing Recovery Break */}
      <BreathingBreakModal
        isOpen={isBreathingOpen}
        onClose={() => setIsBreathingOpen(false)}
        breakMinutes={5}
      />

      {/* Keyboard Shortcuts Help Overlay (?) */}
      {isShortcutsHelpOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setIsShortcutsHelpOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-slate-900 px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white text-base">Keyboard Shortcuts</h3>
                <p className="text-xs text-slate-400 mt-0.5">FocusForge Command & Flow</p>
              </div>
              <button
                onClick={() => setIsShortcutsHelpOpen(false)}
                className="text-slate-400 hover:text-white transition p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-3.5">
              {[
                { key: 'Ctrl + K', action: 'Command Palette', desc: 'Jump anywhere, search tasks, launch timers' },
                { key: 'Ctrl + J', action: 'Distraction Pad', desc: 'Park intrusive thoughts without breaking flow' },
                { key: 'Escape', action: 'Close Overlays / Exit Zen', desc: 'Close open dialogs or dismiss modals' },
                { key: '?', action: 'Shortcut Guide', desc: 'Toggle this keyboard shortcut guide' },
              ].map(({ key, action, desc }) => (
                <div key={key} className="flex items-start gap-4">
                  <kbd className="shrink-0 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-300 text-xs font-mono font-bold text-slate-700 whitespace-nowrap shadow-xs">
                    {key}
                  </kbd>
                  <div>
                    <div className="text-xs font-bold text-slate-900">{action}</div>
                    <div className="text-[11px] text-slate-500">{desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 text-center text-xs text-slate-400">
              Press <kbd className="px-1.5 py-0.5 rounded bg-slate-200 font-mono text-slate-700 text-[10px]">?</kbd> or <kbd className="px-1.5 py-0.5 rounded bg-slate-200 font-mono text-slate-700 text-[10px]">Esc</kbd> to close
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MainLayout;
