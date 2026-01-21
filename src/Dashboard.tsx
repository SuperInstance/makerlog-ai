/**
 * Makerlog.ai Dashboard
 * 
 * A gamified quota harvesting dashboard for Cloudflare free tier users.
 * Shows quota usage, task queue, and achievements.
 */

import React, { useState, useEffect, useCallback } from 'react';

// Types
interface QuotaUsage {
  images: { used: number; limit: number; remaining: number };
  tokens: { used: number; limit: number; remaining: number };
  resetAt: string;
}

interface Task {
  id: string;
  type: 'image-gen' | 'text-gen' | 'code-summary';
  status: 'queued' | 'running' | 'completed' | 'failed';
  prompt: string;
  priority: number;
  result_url?: string;
  created_at: number;
}

interface Achievement {
  id: string;
  achievement_type: string;
  xp_awarded: number;
  unlocked_at: number;
}

interface UserStats {
  xp: number;
  level: number;
  streak_days: number;
}

const ACHIEVEMENT_META: Record<string, { name: string; icon: string; description: string }> = {
  'first_harvest': { name: 'First Harvest', icon: '🌾', description: 'Complete your first harvest' },
  'perfect_day': { name: 'Perfect Day', icon: '🔥', description: '100% quota usage in one day' },
  'time_saver': { name: 'Time Hacker', icon: '⏱️', description: 'Save 10 hours total' },
  'streak_7': { name: 'Week Warrior', icon: '🏆', description: '7-day harvest streak' },
  'hundred_tasks': { name: 'Century Club', icon: '💯', description: 'Complete 100 tasks' },
};

const API_BASE = '/api'; // Adjust for your deployment

// ============ COMPONENTS ============

function QuotaBar({ 
  label, 
  used, 
  max, 
  icon, 
  color,
  onHarvest 
}: { 
  label: string; 
  used: number; 
  max: number; 
  icon: string;
  color: string;
  onHarvest: () => void;
}) {
  const percentage = Math.min((used / max) * 100, 100);
  const remaining = max - used;
  const isLow = percentage > 85;
  
  return (
    <div 
      onClick={isLow ? onHarvest : undefined}
      className={`rounded-xl p-4 transition-all ${
        isLow 
          ? 'ring-2 ring-green-400 cursor-pointer hover:ring-green-300 animate-pulse' 
          : 'hover:bg-slate-800/50'
      } bg-slate-800/30`}
    >
      <div className="flex justify-between items-center mb-2">
        <span className="font-semibold text-white flex items-center gap-2">
          <span className="text-xl">{icon}</span>
          {label}
        </span>
        <span className="text-sm text-slate-400">
          {used.toLocaleString()} / {max.toLocaleString()}
        </span>
      </div>
      
      <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
        <div 
          className={`h-full transition-all duration-500 ${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      
      <div className="flex justify-between items-center mt-2">
        <span className="text-xs text-slate-500">
          {remaining.toLocaleString()} remaining
        </span>
        {isLow && (
          <span className="text-green-400 text-xs font-medium">
            ▲ Click to harvest!
          </span>
        )}
      </div>
    </div>
  );
}

function HarvestButton({ 
  remaining, 
  resetAt, 
  isHarvesting,
  onActivate 
}: { 
  remaining: number;
  resetAt: string;
  isHarvesting: boolean;
  onActivate: () => void;
}) {
  const resetDate = new Date(resetAt);
  const hoursUntilReset = Math.max(0, (resetDate.getTime() - Date.now()) / (1000 * 60 * 60));
  const isUrgent = hoursUntilReset < 4;
  
  return (
    <button
      onClick={onActivate}
      disabled={isHarvesting || remaining === 0}
      className={`w-full py-4 px-6 rounded-xl font-bold text-lg transition-all ${
        isUrgent 
          ? 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400' 
          : 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400'
      } ${
        isHarvesting ? 'opacity-50 cursor-not-allowed' : ''
      } text-white shadow-lg`}
    >
      {isHarvesting ? (
        <span className="flex items-center justify-center gap-2">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Harvesting...
        </span>
      ) : isUrgent ? (
        `⏰ USE IT OR LOSE IT! ${Math.round(hoursUntilReset)}h left`
      ) : (
        `🌾 Harvest ${remaining.toLocaleString()} remaining`
      )}
    </button>
  );
}

function TaskQueue({ 
  tasks, 
  onExecute 
}: { 
  tasks: Task[];
  onExecute: (taskId: string) => void;
}) {
  const queued = tasks.filter(t => t.status === 'queued');
  const running = tasks.filter(t => t.status === 'running');
  const completed = tasks.filter(t => t.status === 'completed').slice(0, 5);
  
  const TaskItem = ({ task, showActions }: { task: Task; showActions?: boolean }) => (
    <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg mb-2">
      <div className="flex items-center gap-3">
        <span className="text-lg">
          {task.type === 'image-gen' ? '🎨' : task.type === 'text-gen' ? '📝' : '💻'}
        </span>
        <div>
          <p className="text-sm text-white truncate max-w-[200px]">{task.prompt}</p>
          <p className="text-xs text-slate-500">
            {task.status === 'running' ? '⏳ Running...' : 
             task.status === 'completed' ? '✅ Done' :
             task.status === 'failed' ? '❌ Failed' :
             `Priority ${task.priority}`}
          </p>
        </div>
      </div>
      {showActions && task.status === 'queued' && (
        <button 
          onClick={() => onExecute(task.id)}
          className="text-xs bg-blue-500 hover:bg-blue-400 px-3 py-1 rounded text-white"
        >
          Run Now
        </button>
      )}
      {task.result_url && (
        <a 
          href={task.result_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-400 hover:text-blue-300"
        >
          View →
        </a>
      )}
    </div>
  );
  
  return (
    <div className="bg-slate-900/50 rounded-xl p-4">
      <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        📋 Task Queue
        <span className="text-xs bg-slate-700 px-2 py-1 rounded-full text-slate-400">
          {queued.length} queued
        </span>
      </h2>
      
      {running.length > 0 && (
        <div className="mb-4">
          <h3 className="text-xs uppercase text-slate-500 mb-2">Running</h3>
          {running.map(task => <TaskItem key={task.id} task={task} />)}
        </div>
      )}
      
      {queued.length > 0 && (
        <div className="mb-4">
          <h3 className="text-xs uppercase text-slate-500 mb-2">Queued</h3>
          {queued.slice(0, 5).map(task => <TaskItem key={task.id} task={task} showActions />)}
          {queued.length > 5 && (
            <p className="text-xs text-slate-500 text-center">+{queued.length - 5} more</p>
          )}
        </div>
      )}
      
      {completed.length > 0 && (
        <div>
          <h3 className="text-xs uppercase text-slate-500 mb-2">Recently Completed</h3>
          {completed.map(task => <TaskItem key={task.id} task={task} />)}
        </div>
      )}
      
      {tasks.length === 0 && (
        <p className="text-slate-500 text-center py-8">No tasks yet. Queue your first task!</p>
      )}
    </div>
  );
}

function AchievementPanel({ 
  user, 
  achievements 
}: { 
  user: UserStats;
  achievements: Achievement[];
}) {
  const xpToNext = Math.pow(user.level, 2) * 100;
  const xpProgress = (user.xp % xpToNext) / xpToNext * 100;
  
  return (
    <div className="bg-slate-900/50 rounded-xl p-4">
      <h2 className="text-lg font-bold text-white mb-4">🏆 Progress</h2>
      
      {/* Level & XP */}
      <div className="mb-4 p-3 bg-gradient-to-r from-purple-900/50 to-blue-900/50 rounded-lg">
        <div className="flex justify-between items-center mb-2">
          <span className="text-white font-bold">Level {user.level}</span>
          <span className="text-sm text-slate-400">{user.xp.toLocaleString()} XP</span>
        </div>
        <div className="w-full bg-slate-700 rounded-full h-2">
          <div 
            className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all"
            style={{ width: `${xpProgress}%` }}
          />
        </div>
      </div>
      
      {/* Streak */}
      <div className="mb-4 p-3 bg-slate-800/50 rounded-lg flex items-center justify-between">
        <span className="text-white">🔥 Streak</span>
        <span className="text-2xl font-bold text-orange-400">{user.streak_days} days</span>
      </div>
      
      {/* Recent Achievements */}
      <h3 className="text-xs uppercase text-slate-500 mb-2">Recent Achievements</h3>
      <div className="space-y-2">
        {achievements.slice(0, 3).map(a => {
          const meta = ACHIEVEMENT_META[a.achievement_type];
          return (
            <div key={a.id} className="flex items-center gap-3 p-2 bg-slate-800/30 rounded-lg">
              <span className="text-2xl">{meta?.icon || '🎖️'}</span>
              <div>
                <p className="text-sm text-white font-medium">{meta?.name || a.achievement_type}</p>
                <p className="text-xs text-slate-500">+{a.xp_awarded} XP</p>
              </div>
            </div>
          );
        })}
        {achievements.length === 0 && (
          <p className="text-slate-500 text-sm text-center py-4">Start harvesting to earn achievements!</p>
        )}
      </div>
    </div>
  );
}

function AddTaskModal({ 
  isOpen, 
  onClose, 
  onSubmit 
}: { 
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (type: string, prompt: string) => void;
}) {
  const [type, setType] = useState('image-gen');
  const [prompt, setPrompt] = useState('');
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl p-6 max-w-md w-full">
        <h2 className="text-xl font-bold text-white mb-4">Queue New Task</h2>
        
        <div className="mb-4">
          <label className="text-sm text-slate-400 mb-1 block">Task Type</label>
          <select 
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full bg-slate-700 text-white rounded-lg px-4 py-2 border border-slate-600 focus:border-blue-500 outline-none"
          >
            <option value="image-gen">🎨 Image Generation</option>
            <option value="text-gen">📝 Text Generation</option>
            <option value="code-summary">💻 Code Summary</option>
          </select>
        </div>
        
        <div className="mb-4">
          <label className="text-sm text-slate-400 mb-1 block">Prompt</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={type === 'image-gen' ? 'A pixel art icon of...' : 'Describe what you want...'}
            className="w-full bg-slate-700 text-white rounded-lg px-4 py-2 border border-slate-600 focus:border-blue-500 outline-none resize-none h-24"
          />
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 px-4 rounded-lg bg-slate-700 text-white hover:bg-slate-600 transition"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (prompt.trim()) {
                onSubmit(type, prompt);
                setPrompt('');
                onClose();
              }
            }}
            className="flex-1 py-2 px-4 rounded-lg bg-blue-500 text-white hover:bg-blue-400 transition"
          >
            Queue Task
          </button>
        </div>
      </div>
    </div>
  );
}

// ============ MAIN DASHBOARD ============

export default function MakerlogDashboard() {
  const [quota, setQuota] = useState<QuotaUsage | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [user, setUser] = useState<UserStats>({ xp: 0, level: 1, streak_days: 0 });
  const [isHarvesting, setIsHarvesting] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      const [quotaRes, tasksRes, achievementsRes] = await Promise.all([
        fetch(`${API_BASE}/quota`),
        fetch(`${API_BASE}/tasks`),
        fetch(`${API_BASE}/achievements`),
      ]);
      
      if (quotaRes.ok) setQuota(await quotaRes.json());
      if (tasksRes.ok) {
        const data = await tasksRes.json();
        setTasks(data.tasks);
      }
      if (achievementsRes.ok) {
        const data = await achievementsRes.json();
        setAchievements(data.unlocked);
        setUser(data.user);
      }
    } catch (e) {
      setError('Failed to fetch data');
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [fetchData]);

  // Harvest handler
  const handleHarvest = async () => {
    setIsHarvesting(true);
    try {
      const res = await fetch(`${API_BASE}/harvest`, { method: 'POST' });
      if (res.ok) {
        await fetchData();
      }
    } catch (e) {
      setError('Harvest failed');
    } finally {
      setIsHarvesting(false);
    }
  };

  // Add task handler
  const handleAddTask = async (type: string, prompt: string) => {
    try {
      const res = await fetch(`${API_BASE}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, prompt, priority: 1 }),
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (e) {
      setError('Failed to add task');
    }
  };

  // Execute single task
  const handleExecuteTask = async (taskId: string) => {
    try {
      await fetch(`${API_BASE}/tasks/${taskId}/execute`, { method: 'POST' });
      await fetchData();
    } catch (e) {
      setError('Failed to execute task');
    }
  };

  const totalRemaining = quota 
    ? quota.images.remaining + Math.floor(quota.tokens.remaining / 1000)
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Header */}
      <header className="border-b border-slate-700 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🪵</span>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
              Makerlog.ai
            </h1>
          </div>
          <button
            onClick={() => setShowAddTask(true)}
            className="bg-blue-500 hover:bg-blue-400 px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            + New Task
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto p-6">
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 mb-6">
            <p className="text-red-400">{error}</p>
            <button onClick={() => setError(null)} className="text-sm text-red-300 underline">
              Dismiss
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Quota & Harvest */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quota Bars */}
            <div className="space-y-4">
              <h2 className="text-sm uppercase text-slate-500 font-medium">Daily Budget</h2>
              
              {quota ? (
                <>
                  <QuotaBar
                    label="Image Generations"
                    used={quota.images.used}
                    max={quota.images.limit}
                    icon="🎨"
                    color="bg-purple-500"
                    onHarvest={handleHarvest}
                  />
                  <QuotaBar
                    label="AI Tokens"
                    used={quota.tokens.used}
                    max={quota.tokens.limit}
                    icon="📝"
                    color="bg-blue-500"
                    onHarvest={handleHarvest}
                  />
                </>
              ) : (
                <div className="animate-pulse space-y-4">
                  <div className="h-20 bg-slate-800 rounded-xl" />
                  <div className="h-20 bg-slate-800 rounded-xl" />
                </div>
              )}
            </div>

            {/* Harvest Button */}
            {quota && (
              <HarvestButton
                remaining={totalRemaining}
                resetAt={quota.resetAt}
                isHarvesting={isHarvesting}
                onActivate={handleHarvest}
              />
            )}

            {/* Task Queue */}
            <TaskQueue tasks={tasks} onExecute={handleExecuteTask} />
          </div>

          {/* Right Column: Achievements */}
          <div>
            <AchievementPanel user={user} achievements={achievements} />
          </div>
        </div>
      </main>

      {/* Add Task Modal */}
      <AddTaskModal
        isOpen={showAddTask}
        onClose={() => setShowAddTask(false)}
        onSubmit={handleAddTask}
      />
    </div>
  );
}
