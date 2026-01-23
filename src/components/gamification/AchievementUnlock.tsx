/**
 * AchievementUnlock Component
 *
 * Celebration when an achievement is unlocked:
 * - Card flip animation
 * - Shine effect
 * - Toast notification
 * - Haptic feedback
 */

import React, { useEffect, useState } from 'react';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  xp: number;
}

interface AchievementUnlockProps {
  achievement: Achievement;
  onComplete?: () => void;
}

export function AchievementUnlock({ achievement, onComplete }: AchievementUnlockProps) {
  const [stage, setStage] = useState<'flip' | 'shine' | 'display' | 'done'>('flip');
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Flip stage
    const flipTimer = setTimeout(() => setStage('shine'), 400);
    // Shine stage
    const shineTimer = setTimeout(() => setStage('display'), 800);

    // Trigger haptic feedback if available
    if ('vibrate' in navigator) {
      navigator.vibrate([50, 50, 50]);
    }

    return () => {
      clearTimeout(flipTimer);
      clearTimeout(shineTimer);
    };
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    setTimeout(() => {
      onComplete?.();
    }, 300);
  };

  if (dismissed) return null;

  return (
    <div
      className="fixed top-4 right-4 z-50 min-w-[320px] max-w-sm"
      style={{
        animation: stage === 'flip' ? 'cardFlip 0.4s ease-out forwards' : 'none',
      }}
    >
      <div
        className="bg-gradient-to-br from-yellow-900/90 to-orange-900/90 backdrop-blur-sm border-2 border-yellow-500 rounded-xl p-4 shadow-2xl relative overflow-hidden"
        style={{
          transform: stage === 'done' ? 'translateX(120%)' : 'translateX(0)',
          transition: 'transform 0.3s ease-out',
        }}
      >
        {/* Shine effect */}
        {stage === 'shine' && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
              animation: 'shineSwipe 0.6s ease-out forwards',
            }}
          />
        )}

        {/* Achievement icon with pulse */}
        <div className="flex items-start gap-4">
          <div
            className="text-4xl flex-shrink-0"
            style={{
              animation: stage === 'display' ? 'iconBounce 0.6s ease-out' : 'none',
            }}
          >
            {achievement.icon}
          </div>

          <div className="flex-1 min-w-0">
            {/* Achievement unlocked badge */}
            <div className="text-xs font-bold text-yellow-400 uppercase tracking-wide mb-1">
              Achievement Unlocked!
            </div>

            {/* Achievement name */}
            <h3 className="text-lg font-bold text-white mb-1 truncate">
              {achievement.name}
            </h3>

            {/* Description */}
            <p className="text-sm text-slate-300 mb-2 line-clamp-2">
              {achievement.description}
            </p>

            {/* XP reward badge */}
            <div className="inline-flex items-center gap-1 bg-yellow-500/20 text-yellow-400 text-sm font-bold px-2 py-1 rounded-full">
              <span>+{achievement.xp} XP</span>
            </div>
          </div>
        </div>

        {/* Dismiss button */}
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 text-slate-400 hover:text-white transition-colors p-1 rounded hover:bg-white/10"
          aria-label="Dismiss"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Progress bar animation */}
        <div className="mt-3 h-1 bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full"
            style={{
              width: '0%',
              animation: 'progressFill 0.8s ease-out 0.4s forwards',
            }}
          />
        </div>
      </div>

      <style>{`
        @keyframes cardFlip {
          0% {
            transform: rotateY(90deg) translateX(100%);
            opacity: 0;
          }
          100% {
            transform: rotateY(0) translateX(0);
            opacity: 1;
          }
        }

        @keyframes shineSwipe {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }

        @keyframes iconBounce {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.3); }
        }

        @keyframes progressFill {
          0% { width: 0%; }
          100% { width: 100%; }
        }
      `}</style>
    </div>
  );
}

/**
 * Hook to show achievement unlock celebrations
 */
export function useAchievementUnlock() {
  const [queue, setQueue] = useState<Achievement[]>([]);

  const showAchievement = (achievement: Achievement) => {
    setQueue((prev) => [...prev, achievement]);
  };

  const handleComplete = (id: string) => {
    setQueue((prev) => prev.filter((a) => a.id !== id));
  };

  const AchievementQueue = () => {
    const [current] = queue;

    if (!current) return null;

    return <AchievementUnlock achievement={current} onComplete={() => handleComplete(current.id)} />;
  };

  return { showAchievement, AchievementQueue };
}
