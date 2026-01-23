/**
 * Enhanced Achievement Panel with Gamification
 *
 * This is an enhanced version of the AchievementPanel from Dashboard.tsx
 * with all the delightful gamification polish integrated.
 *
 * Usage: Replace the AchievementPanel in Dashboard.tsx with this component
 */

import React, { useState, useEffect } from 'react';
import {
  CircularProgress,
  AnimatedCounter,
  StreakVisualization,
  useXPFloat,
  useGamificationToasts,
  LevelUpCelebration,
  useAchievementUnlock,
} from './index';

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

/**
 * Enhanced Achievement Panel with all gamification features
 */
export function GamifiedAchievementPanel({
  user,
  achievements,
  onXPChange,
}: {
  user: UserStats;
  achievements: Achievement[];
  onXPChange?: (newXP: number, oldXP: number) => void;
}) {
  const [previousLevel, setPreviousLevel] = useState(user.level);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [lastHarvestAt, setLastHarvestAt] = useState<number>(Date.now());

  const { showXP, XPFloatContainer } = useXPFloat();
  const { showAchievement, AchievementQueue } = useAchievementUnlock();
  const { toasts, dismissAll } = useGamificationToasts();

  const xpToNext = Math.pow(user.level, 2) * 100;
  const xpProgress = (user.xp % xpToNext) / xpToNext * 100;

  // Check for level up
  useEffect(() => {
    if (user.level > previousLevel) {
      setShowLevelUp(true);
      // Trigger haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate([100, 50, 100, 50, 200]);
      }
      setPreviousLevel(user.level);
    }
  }, [user.level, previousLevel]);

  // Check for new achievements
  useEffect(() => {
    if (achievements.length > 0) {
      const latestAchievement = achievements[0];
      const meta = ACHIEVEMENT_META[latestAchievement.achievement_type];
      if (meta) {
        // Show achievement unlock celebration
        showAchievement({
          id: latestAchievement.id,
          name: meta.name,
          description: meta.description,
          icon: meta.icon,
          xp: latestAchievement.xp_awarded,
        });

        // Show floating XP
        showXP(latestAchievement.xp_awarded);
      }
    }
  }, [achievements, showAchievement, showXP]);

  const handleLevelUpComplete = () => {
    setShowLevelUp(false);
  };

  // Calculate if "on fire" (high quota usage or long streak)
  const isOnFire = user.streak_days >= 7 || xpProgress > 80;

  return (
    <div className="relative">
      {/* Level Up Celebration Overlay */}
      {showLevelUp && (
        <LevelUpCelebration level={user.level} onComplete={handleLevelUpComplete} />
      )}

      {/* XP Float Container */}
      <XPFloatContainer />

      {/* Achievement Queue */}
      <AchievementQueue />

      {/* Main Panel */}
      <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/50 hover:border-slate-700 transition-colors">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          🏆 Progress
          {isOnFire && (
            <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-1 rounded-full animate-pulse">
              On Fire!
            </span>
          )}
        </h2>

        {/* Circular Progress for Level */}
        <div className="flex justify-center mb-4">
          <CircularProgress
            percentage={xpProgress}
            size={140}
            strokeWidth={12}
            label={`Level ${user.level}`}
            showFire={isOnFire}
            color={user.level >= 10 ? 'purple' : user.level >= 5 ? 'blue' : 'green'}
          />
        </div>

        {/* XP Details */}
        <div className="bg-slate-800/50 rounded-lg p-3 mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-slate-400">Total XP</span>
            <AnimatedCounter
              value={user.xp}
              prefix=""
              suffix=""
            />
          </div>
          <div className="flex justify-between items-center text-xs text-slate-500">
            <span>Progress to Level {user.level + 1}</span>
            <span>{Math.round(xpProgress)}%</span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2 mt-2 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all duration-500 shimmer"
              style={{ width: `${xpProgress}%` }}
            />
          </div>
        </div>

        {/* Enhanced Streak Visualization */}
        <StreakVisualization
          streakDays={user.streak_days}
          lastHarvestAt={lastHarvestAt}
        />

        {/* Recent Achievements with flip animation */}
        <div className="mt-4">
          <h3 className="text-xs uppercase text-slate-500 mb-2">Recent Achievements</h3>
          <div className="space-y-2">
            {achievements.slice(0, 3).map((a, index) => {
              const meta = ACHIEVEMENT_META[a.achievement_type];
              return (
                <div
                  key={a.id}
                  className={`
                    flex items-center gap-3 p-3 rounded-lg
                    bg-gradient-to-r from-green-900/20 to-emerald-900/20
                    border border-green-700/30
                    hover:border-green-600/50 transition-all
                    card-flip
                  `}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <span className="text-2xl animate-bounce" style={{ animationDelay: `${index * 150}ms` }}>
                    {meta?.icon || '🎖️'}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm text-white font-medium">{meta?.name || a.achievement_type}</p>
                    <p className="text-xs text-slate-500">{meta?.description}</p>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-full font-bold">
                      +{a.xp_awarded} XP
                    </span>
                    <span className="text-xs text-slate-600 mt-1">
                      {new Date(a.unlocked_at * 1000).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              );
            })}
            {achievements.length === 0 && (
              <div className="text-center py-6 fade-in">
                <span className="text-3xl mb-2 block">🏆</span>
                <p className="text-slate-500 text-sm">Start harvesting to earn achievements!</p>
              </div>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="bg-slate-800/30 rounded-lg p-3 text-center hover:bg-slate-800/50 transition-colors">
            <div className="text-2xl font-bold text-blue-400">
              <AnimatedCounter value={achievements.length} />
            </div>
            <div className="text-xs text-slate-500">Achievements</div>
          </div>
          <div className="bg-slate-800/30 rounded-lg p-3 text-center hover:bg-slate-800/50 transition-colors">
            <div className="text-2xl font-bold text-purple-400">
              Level {user.level}
            </div>
            <div className="text-xs text-slate-500">Current Level</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Example of how to integrate with harvest completion
 */
export function useHarvestCompletion() {
  const { showXP, showXPMultiple } = useXPFloat();
  const { showAchievement } = useAchievementUnlock();
  const { showHarvest } = useGamificationToasts();

  const handleHarvestComplete = (result: {
    tasksExecuted: number;
    xpEarned: number;
    newAchievements: Array<{ name: string; description: string; icon: string; xp: number }>;
    newLevel?: number;
  }) => {
    // Show harvest toast
    showHarvest(result.tasksExecuted);

    // Show floating XP (with multiple particles for large gains)
    if (result.xpEarned > 100) {
      showXPMultiple(result.xpEarned, 5);
    } else {
      showXP(result.xpEarned);
    }

    // Show achievement unlocks
    result.newAchievements.forEach((achievement, index) => {
      setTimeout(() => {
        showAchievement(achievement);
      }, index * 2000);
    });

    // Trigger haptic feedback
    if ('vibrate' in navigator) {
      const pattern = result.tasksExecuted > 10
        ? [100, 50, 100, 50, 100, 50, 200]
        : [50, 50, 50];
      navigator.vibrate(pattern);
    }
  };

  return { handleHarvestComplete };
}
