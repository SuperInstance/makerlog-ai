/**
 * StreakVisualization Component
 *
 * Enhanced streak display with:
 * - Animated flame that grows with streak
 * - Streak calendar heatmap (GitHub-style)
 * - Encouragement messages
 * - Graceful streak break handling
 */

import React, { useState, useEffect } from 'react';

interface StreakVisualizationProps {
  streakDays: number;
  lastHarvestAt?: number;
  onEncouragement?: () => void;
}

/**
 * Animated flame icon that grows with streak
 */
function AnimatedFlame({ streakDays }: { streakDays: number }) {
  // Flame grows with streak (caps at 30 days for visual sizing)
  const size = Math.min(0.8 + (streakDays / 30) * 0.4, 1.2);
  // Animation speed increases with longer streaks
  const duration = Math.max(2 - (streakDays / 100), 0.5);
  // Color intensifies with longer streaks
  const flameColor = streakDays >= 30 ? '🔥' : streakDays >= 14 ? '🔥' : streakDays >= 7 ? '🔥' : '🔥';

  return (
    <span
      className="inline-block"
      style={{
        fontSize: `${size * 2}rem`,
        animation: `flameFlicker ${duration}s ease-in-out infinite`,
        filter: `brightness(${1 + streakDays * 0.02})`,
      }}
    >
      {flameColor}
    </span>
  );
}

/**
 * Streak calendar heatmap (GitHub contribution graph style)
 */
function StreakCalendar({ streakDays }: { streakDays: number }) {
  const [weeks, setWeeks] = useState<number[][]>([]);

  useEffect(() => {
    // Generate 12 weeks of fake data for visual demo
    // In production, this would come from actual harvest data
    const generatedWeeks: number[][] = [];
    for (let i = 0; i < 12; i++) {
      const week: number[] = [];
      for (let j = 0; j < 7; j++) {
        // More recent days more likely to have activity
        const activityChance = i > 8 ? Math.random() * 0.8 : Math.random() * 0.3;
        week.push(Math.random() < activityChance ? Math.ceil(Math.random() * 4) : 0);
      }
      generatedWeeks.push(week);
    }
    setWeeks(generatedWeeks);
  }, [streakDays]);

  const getCellColor = (level: number) => {
    switch (level) {
      case 0: return 'bg-slate-800';
      case 1: return 'bg-green-900';
      case 2: return 'bg-green-700';
      case 3: return 'bg-green-500';
      case 4: return 'bg-green-400';
      default: return 'bg-slate-800';
    }
  };

  return (
    <div className="mt-4">
      <div className="flex gap-1 flex-wrap">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="flex flex-col gap-1">
            {week.map((level, dayIndex) => (
              <div
                key={`${weekIndex}-${dayIndex}`}
                className={`w-3 h-3 rounded-sm ${getCellColor(level)} transition-all hover:scale-150`}
                title={level > 0 ? `${level} harvest${level > 1 ? 's' : ''}` : 'No activity'}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
        <span>Less</span>
        <div className="flex gap-1">
          {[0, 1, 2, 3, 4].map((level) => (
            <div
              key={level}
              className={`w-3 h-3 rounded-sm ${getCellColor(level)}`}
            />
          ))}
        </div>
        <span>More</span>
      </div>
    </div>
  );
}

/**
 * Encouragement message based on streak
 */
function StreakEncouragement({ streakDays }: { streakDays: number }) {
  const messages = {
    0: "Start your streak today!",
    1: "Great start! Keep it going!",
    3: "3-day streak! You're building momentum!",
    7: "A full week! You're on fire!",
    14: "Two weeks! Incredible dedication!",
    21: "Three weeks! You're unstoppable!",
    30: "A whole month! Legendary!",
    60: "Two months! You're a harvest master!",
    100: "100 days! Absolutely phenomenal!",
  };

  // Find the best matching message
  const message = Object.entries(messages)
    .sort(([a], [b]) => parseInt(b) - parseInt(a))
    .find(([days]) => streakDays >= parseInt(days))?.[1] || messages[0];

  return (
    <p className="text-sm text-slate-400 mt-2 italic">
      {message}
    </p>
  );
}

/**
 * Main streak visualization component
 */
export function StreakVisualization({ streakDays, lastHarvestAt, onEncouragement }: StreakVisualizationProps) {
  const [showCalendar, setShowCalendar] = useState(false);

  // Calculate if streak is at risk
  const hoursSinceLastHarvest = lastHarvestAt
    ? (Date.now() - lastHarvestAt) / (1000 * 60 * 60)
    : Infinity;
  const atRisk = hoursSinceLastHarvest > 20;

  return (
    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700 relative overflow-hidden">
      {/* Background gradient based on streak intensity */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          background: `radial-gradient(circle at top right, ${
            streakDays >= 30 ? '#fbbf24' :
            streakDays >= 14 ? '#fb923c' :
            streakDays >= 7 ? '#f87171' :
            '#94a3b8'
          } 0%, transparent 70%)`,
        }}
      />

      <div className="relative">
        {/* Header with flame and count */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <AnimatedFlame streakDays={streakDays} />
            <div>
              <div className="text-xs text-slate-400">Current Streak</div>
              <div className="text-2xl font-bold text-white">
                {streakDays} day{streakDays !== 1 ? 's' : ''}
              </div>
            </div>
          </div>

          {/* Streak milestone badges */}
          {streakDays >= 7 && (
            <span className="text-2xl animate-pulse" title="Week Warrior">
              🏆
            </span>
          )}
          {streakDays >= 30 && (
            <span className="text-2xl animate-pulse" style={{ animationDelay: '0.5s' }} title="Month Master">
              💎
            </span>
          )}
        </div>

        {/* Progress to next milestone */}
        <div className="mb-3">
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span>Progress to next milestone</span>
            <span>
              {streakDays < 7 ? `${7 - streakDays} days to Week Warrior` :
               streakDays < 14 ? `${14 - streakDays} days to Two Weeks` :
               streakDays < 30 ? `${30 - streakDays} days to Month Master` :
               'MAX LEVEL!'}
            </span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full transition-all duration-500"
              style={{
                width: `${Math.min((streakDays % 7) / 7 * 100, 100)}%`,
                animation: streakDays > 0 ? 'progressPulse 2s ease-in-out infinite' : 'none',
              }}
            />
          </div>
        </div>

        {/* At risk warning */}
        {atRisk && (
          <div className="mb-3 bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-2 flex items-center gap-2">
            <span className="text-yellow-500">⚠️</span>
            <span className="text-sm text-yellow-400">
              Streak at risk! Harvest soon to maintain your streak.
            </span>
          </div>
        )}

        {/* Encouragement message */}
        <StreakEncouragement streakDays={streakDays} />

        {/* Toggle calendar */}
        <button
          onClick={() => setShowCalendar(!showCalendar)}
          className="mt-3 text-xs text-slate-500 hover:text-slate-300 transition-colors btn-press"
        >
          {showCalendar ? 'Hide' : 'Show'} calendar
        </button>

        {/* Calendar heatmap */}
        {showCalendar && <StreakCalendar streakDays={streakDays} />}
      </div>

      <style>{`
        @keyframes flameFlicker {
          0%, 100% { transform: scale(1) rotate(-2deg); }
          25% { transform: scale(1.05) rotate(2deg); }
          50% { transform: scale(0.95) rotate(-1deg); }
          75% { transform: scale(1.02) rotate(1deg); }
        }

        @keyframes progressPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </div>
  );
}
