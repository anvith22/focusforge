import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Flame,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles,
  Calendar,
  Plus,
  Play,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react';
import * as api from '../lib/api';
import { useFocusTimer } from '../hooks/useFocusTimer';
import FocusTimer from '../components/FocusTimer';
import TaskCard from '../components/TaskCard';
import ProgressCard from '../components/ProgressCard';
import CreateTaskModal from '../components/CreateTaskModal';

export const TodayPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [tomorrowAction, setTomorrowAction] = useState<string>('');
  const [isTomorrowSaved, setIsTomorrowSaved] = useState<boolean>(false);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);

  // Projects query for task assignment
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.getProjects(),
  });

  // Fetch today's real database dashboard
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['todayDashboard'],
    queryFn: () => api.getTodayDashboard(),
    refetchInterval: 10000,
  });

  // Fetch weekly dashboard for streaks
  const { data: weeklyData } = useQuery({
    queryKey: ['weeklyDashboard'],
    queryFn: () => api.getWeeklyDashboard(),
  });

  // Focus timer hook
  const {
    activeSession,
    isPaused,
    remainingSeconds,
    elapsedSeconds,
    error: timerError,
    startTimer,
    pauseTimer,
    resumeTimer,
    completeTimer,
    abandonTimer,
    refreshSession,
  } = useFocusTimer(() => {
    queryClient.invalidateQueries({ queryKey: ['todayDashboard'] });
    queryClient.invalidateQueries({ queryKey: ['activeSession'] });
    queryClient.invalidateQueries({ queryKey: ['weeklyDashboard'] });
  });

  // Mutation to toggle task status
  const toggleTaskMutation = useMutation({
    mutationFn: ({ id, currentStatus }: { id: string; currentStatus: string }) => {
      const nextStatus = currentStatus === 'done' ? 'todo' : 'done';
      return api.updateTask(id, { status: nextStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todayDashboard'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  // Mutation to convert tomorrow's action into an actual task
  const createTomorrowTaskMutation = useMutation({
    mutationFn: async () => {
      const targetProjectId = nextTask?.project_id || projects[0]?.id;
      if (!targetProjectId) throw new Error('No project available to assign task');
      return api.createTask({
        project_id: targetProjectId,
        title: tomorrowAction.trim(),
        priority: 'high',
        recurrence: 'none',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['todayDashboard'] });
      setTomorrowAction('');
      setIsTomorrowSaved(true);
      setTimeout(() => setIsTomorrowSaved(false), 3000);
    },
  });

  const nextTask = data?.next_task;
  const todayTasks = data?.today_tasks || [];
  const completedSessions = data?.completed_sessions || [];
  const focusMinutes = data?.total_actual_focus_minutes || 0;
  const targetMinutes = data?.daily_stats?.daily_target_minutes || 60;
  const targetPercent = Math.min(100, Math.round((focusMinutes / targetMinutes) * 100));

  const currentStreak = weeklyData?.streaks?.current_streak || 0;
  const streakAtRisk = focusMinutes === 0 && currentStreak >= 3;

  // Dynamic time-of-day greeting
  const getGreeting = () => {
    const h = new Date().getHours();
    if (h >= 5 && h < 12) {
      return { title: 'Morning Focus & Momentum', sub: 'Start strong. Ship one high-impact block before the world wakes up.' };
    }
    if (h >= 12 && h < 17) {
      return { title: 'Afternoon Deep Work', sub: 'Block distractions. Make tangible progress on what matters most.' };
    }
    if (h >= 17 && h < 22) {
      return { title: 'Evening Focus & Momentum', sub: 'Commit to one priority action tonight. Protect your attention.' };
    }
    return { title: 'Late Night Sprint', sub: 'Night owls ship in silence. Execute one focused block before sleep.' };
  };
  const greeting = getGreeting();

  // Handle hero launch
  const handleHeroLaunch = async () => {
    if (nextTask) {
      setSelectedTaskId(nextTask.id);
      await startTimer(nextTask.estimated_minutes || 25, nextTask.id);
    }
  };

  const handleSaveTomorrowAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tomorrowAction.trim()) return;
    localStorage.setItem('focusforge_tomorrow_action', tomorrowAction.trim());
    setIsTomorrowSaved(true);
    setTimeout(() => setIsTomorrowSaved(false), 3000);
  };

  // Format today's date greeting
  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-150">
      {/* Streak-at-Risk Warning Banner */}
      {streakAtRisk && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-sm font-medium shadow-xs">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <span>
            🔥 Your <strong>{currentStreak}-day focus streak</strong> is at risk today! Launch a quick sprint to keep your momentum alive.
          </span>
        </div>
      )}

      {/* Top Greeting Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-1">
            <Calendar className="w-4 h-4" />
            <span>{todayFormatted}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {greeting.title}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {greeting.sub}
          </p>
        </div>

        {/* Quick Sync Button */}
        <button
          onClick={() => {
            refetch();
            refreshSession();
          }}
          className="self-start md:self-auto flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm transition"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Sync Data
        </button>
      </div>

      {/* Top Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ProgressCard
          title="Actual Focus Time"
          value={`${focusMinutes}m`}
          subtitle={`Daily goal: ${targetMinutes}m`}
          icon={Clock}
          progressPercent={targetPercent}
          iconColor="text-blue-600 bg-blue-50"
        />
        <ProgressCard
          title="Sessions Completed"
          value={completedSessions.length}
          subtitle="Sprint sessions logged"
          icon={Flame}
          iconColor="text-amber-600 bg-amber-50"
        />
        <ProgressCard
          title="Tasks Completed"
          value={data?.tasks_completed_today || 0}
          subtitle="Finished today"
          icon={CheckCircle2}
          iconColor="text-emerald-600 bg-emerald-50"
        />
        <ProgressCard
          title="Target Completion"
          value={`${targetPercent}%`}
          subtitle={targetPercent >= 100 ? 'Target achieved! 🎉' : `${targetMinutes - focusMinutes}m remaining`}
          icon={Sparkles}
          iconColor="text-indigo-600 bg-indigo-50"
        />
      </div>

      {/* Main Grid: Left Column (Next Task & Timer), Right Column (Evening Routine & Today Tasks) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column (Timer & Hero Task) */}
        <div className="lg:col-span-6 space-y-6">
          {/* Main Hero Task Card */}
          {nextTask && !activeSession && (
            <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-900 to-indigo-950 text-white shadow-lg border border-blue-800/50">
              <div className="flex items-center justify-between text-xs text-blue-300 font-semibold mb-2">
                <span className="flex items-center gap-1.5 uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                  Recommended Next Action
                </span>
                <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-200 uppercase font-bold text-[10px]">
                  {nextTask.priority} priority
                </span>
              </div>
              <h2 className="text-lg md:text-xl font-bold tracking-tight mb-1 text-white">
                {nextTask.title}
              </h2>
              {nextTask.description && (
                <p className="text-xs text-blue-200/80 mb-4 line-clamp-2 leading-relaxed">
                  {nextTask.description}
                </p>
              )}
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-blue-300 font-medium">
                  {nextTask.project_name ? `Project: ${nextTask.project_name}` : 'Unassigned'}
                </span>
                <button
                  type="button"
                  onClick={handleHeroLaunch}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-400 font-semibold text-xs text-white shadow-md transition"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Launch 25m Focus
                </button>
              </div>
            </div>
          )}

          {/* Interactive Focus Timer */}
          <FocusTimer
            activeSession={activeSession}
            isPaused={isPaused}
            remainingSeconds={remainingSeconds}
            elapsedSeconds={elapsedSeconds}
            availableTasks={todayTasks.filter((t) => t.status !== 'done')}
            selectedTaskId={selectedTaskId}
            onSelectTask={setSelectedTaskId}
            onStart={startTimer}
            onPause={pauseTimer}
            onResume={resumeTimer}
            onComplete={completeTimer}
            onAbandon={abandonTimer}
            error={timerError}
          />
        </div>

        {/* Right Column (Tasks & Evening Routine) */}
        <div className="lg:col-span-6 space-y-6">
          {/* Today's Tasks List */}
          <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Today's Focus Queue</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {todayTasks.filter((t) => t.status !== 'done').length} tasks remaining
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsCreateTaskOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Task</span>
              </button>
            </div>

            {isLoading ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading tasks...</div>
            ) : todayTasks.length === 0 ? (
              <div className="py-6 space-y-4">
                <div className="py-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs text-slate-500">
                  No active tasks scheduled for today. Add a task or pick from your backlog!
                </div>
                {projects.length === 0 && (
                  <div className="p-4 rounded-xl bg-blue-50/80 border border-blue-200/80 space-y-2">
                    <p className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                      Quick Onboarding Guide
                    </p>
                    <ol className="text-xs text-blue-800 space-y-1 list-decimal pl-4">
                      <li>Create your first project in the <strong>Projects</strong> tab</li>
                      <li>Add a sprint task with estimated minutes</li>
                      <li>Launch a focused timer block and protect your attention!</li>
                    </ol>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2.5">
                {todayTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    isNextRecommended={nextTask?.id === task.id}
                    onToggleComplete={(id, curStatus) =>
                      toggleTaskMutation.mutate({ id, currentStatus: curStatus })
                    }
                    onFocusTask={(id, mins) => {
                      setSelectedTaskId(id);
                      startTimer(mins || task.estimated_minutes || 25, id);
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Evening Routine Guide & Tomorrow's First Action */}
          <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Evening Execution System</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Closing the day with clarity for tomorrow</p>
              </div>
            </div>

            {/* Step list */}
            <ol className="text-xs space-y-2 text-slate-600 dark:text-slate-300 border-l-2 border-indigo-100 dark:border-indigo-900/60 pl-4 py-1">
              <li className="font-medium text-slate-800 dark:text-slate-200">
                1. Pick 1 task from your queue and click Start.
              </li>
              <li>2. Keep phone away for the full 25-minute sprint.</li>
              <li>3. Log your accomplishment prompt upon completion.</li>
              <li>4. Define tomorrow morning's first single action below.</li>
            </ol>

            {/* Tomorrow's Action Form */}
            <form onSubmit={handleSaveTomorrowAction} className="pt-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <ArrowRight className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                Tomorrow's First Concrete Action:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tomorrowAction}
                  onChange={(e) => setTomorrowAction(e.target.value)}
                  placeholder="e.g., Code the database index migration..."
                  className="flex-1 text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
                <button
                  type="submit"
                  disabled={!tomorrowAction.trim()}
                  className="px-3.5 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-50 text-white text-xs font-semibold shadow-sm transition border border-transparent dark:border-slate-700"
                >
                  {isTomorrowSaved ? 'Saved! ✨' : 'Save'}
                </button>
                <button
                  type="button"
                  disabled={!tomorrowAction.trim() || createTomorrowTaskMutation.isPending || projects.length === 0}
                  onClick={() => createTomorrowTaskMutation.mutate()}
                  className="px-3.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold shadow-sm transition flex items-center gap-1.5 shrink-0"
                  title="Directly create this as a task in your queue"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Task</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Quick Create Task with Persistence/Weekly Options */}
      <CreateTaskModal
        isOpen={isCreateTaskOpen}
        onClose={() => setIsCreateTaskOpen(false)}
        projects={projects}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['todayDashboard'] });
          queryClient.invalidateQueries({ queryKey: ['tasks'] });
        }}
      />
    </div>
  );
};

export default TodayPage;
