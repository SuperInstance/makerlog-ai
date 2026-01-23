/**
 * GamificationToast Component
 *
 * Toast notification for achievements, XP gains, level ups with:
 * - Slide in/out animations
 * - Stack multiple toasts
 * - Auto-dismiss
 * - Sound effects (optional)
 */

import React, { useEffect, useState } from 'react';

export interface Toast {
  id: string;
  type: 'achievement' | 'xp' | 'level_up' | 'streak' | 'harvest';
  title: string;
  message: string;
  icon: string;
  xp?: number;
  level?: number;
  duration?: number;
}

interface GamificationToastProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

export function GamificationToast({ toast, onDismiss }: GamificationToastProps) {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    // Slide in animation
    const showTimer = setTimeout(() => setVisible(true), 10);

    // Haptic feedback
    if ('vibrate' in navigator) {
      const pattern = toast.type === 'achievement' ? [50, 50, 50] :
                     toast.type === 'level_up' ? [100, 50, 100] :
                     [30];
      navigator.vibrate(pattern);
    }

    // Auto-dismiss
    const duration = toast.duration ?? (toast.type === 'achievement' ? 5000 : 3000);
    const dismissTimer = setTimeout(() => {
      handleDismiss();
    }, duration);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(dismissTimer);
    };
  }, [toast]);

  const handleDismiss = () => {
    setExiting(true);
    setTimeout(() => {
      onDismiss(toast.id);
    }, 300);
  };

  const typeColors = {
    achievement: 'from-yellow-600 to-orange-600',
    xp: 'from-blue-600 to-purple-600',
    level_up: 'from-purple-600 to-pink-600',
    streak: 'from-orange-600 to-red-600',
    harvest: 'from-green-600 to-emerald-600',
  };

  const typeIcons = {
    achievement: '🏆',
    xp: '⭐',
    level_up: '⬆️',
    streak: '🔥',
    harvest: '🌾',
  };

  return (
    <div
      className={`
        relative overflow-hidden rounded-lg shadow-2xl border border-white/10
        transition-all duration-300 cursor-pointer
        ${visible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
        ${exiting ? 'translate-x-full opacity-0' : ''}
      `}
      style={{
        minWidth: '320px',
        maxWidth: '400px',
      }}
      onClick={handleDismiss}
    >
      {/* Background gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br ${typeColors[toast.type]} opacity-90`} />

      {/* Animated shine effect */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%)',
          animation: visible ? 'toastShine 2s ease-in-out infinite' : 'none',
        }}
      />

      {/* Content */}
      <div className="relative p-4">
        <div className="flex items-start gap-3">
          {/* Icon with animation */}
          <div
            className="text-3xl flex-shrink-0"
            style={{
              animation: visible ? 'iconPop 0.4s ease-out' : 'none',
            }}
          >
            {toast.icon || typeIcons[toast.type]}
          </div>

          {/* Text content */}
          <div className="flex-1 min-w-0">
            {/* Title */}
            <h3 className="text-sm font-bold text-white mb-1 truncate">
              {toast.title}
            </h3>

            {/* Message */}
            <p className="text-sm text-white/90 line-clamp-2">
              {toast.message}
            </p>

            {/* XP badge (if applicable) */}
            {toast.xp && (
              <div className="mt-2 inline-flex items-center gap-1 bg-white/20 text-white text-xs font-bold px-2 py-1 rounded-full">
                <span>+{toast.xp} XP</span>
              </div>
            )}

            {/* Level badge (if applicable) */}
            {toast.level && (
              <div className="mt-2 inline-flex items-center gap-1 bg-white/20 text-white text-xs font-bold px-2 py-1 rounded-full">
                <span>Level {toast.level}</span>
              </div>
            )}
          </div>

          {/* Dismiss button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDismiss();
            }}
            className="text-white/60 hover:text-white transition-colors p-1 rounded hover:bg-white/10"
            aria-label="Dismiss"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Progress bar for auto-dismiss */}
        <div
          className="absolute bottom-0 left-0 h-1 bg-white/30"
          style={{
            width: '100%',
            animation: visible ? `progressLine ${toast.duration || 3000}ms linear forwards` : 'none',
          }}
        />
      </div>

      <style>{`
        @keyframes toastShine {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        @keyframes iconPop {
          0% { transform: scale(0); }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }

        @keyframes progressLine {
          0% { width: 100%; }
          100% { width: 0%; }
        }
      `}</style>
    </div>
  );
}

/**
 * Toast container with stack management
 */
interface GamificationToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

export function GamificationToastContainer({
  toasts,
  onDismiss,
  position = 'top-right',
}: GamificationToastContainerProps) {
  const positionClasses = {
    'top-right': 'top-4 right-4 flex-col items-end',
    'top-left': 'top-4 left-4 flex-col items-start',
    'bottom-right': 'bottom-4 right-4 flex-col-reverse items-end',
    'bottom-left': 'bottom-4 left-4 flex-col-reverse items-start',
  };

  return (
    <div
      className={`fixed z-50 flex gap-2 ${positionClasses[position]} pointer-events-none`}
      style={{ maxHeight: '80vh', overflowY: 'auto' }}
    >
      {toasts.map((toast, index) => (
        <div
          key={toast.id}
          className="pointer-events-auto"
          style={{
            transform: `translateY(${index * 8}px)`,
          }}
        >
          <GamificationToast toast={toast} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  );
}

/**
 * Hook for managing toasts
 */
export function useGamificationToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (toast: Omit<Toast, 'id'>) => {
    const newToast: Toast = {
      ...toast,
      id: crypto.randomUUID(),
    };

    setToasts((prev) => [...prev, newToast]);
  };

  const showXP = (amount: number, source: string) => {
    showToast({
      type: 'xp',
      title: 'XP Earned!',
      message: `+${amount} XP from ${source}`,
      icon: '⭐',
      xp: amount,
      duration: 2000,
    });
  };

  const showAchievement = (name: string, xp: number, description: string) => {
    showToast({
      type: 'achievement',
      title: '🏆 Achievement Unlocked!',
      message: `${name}: ${description}`,
      icon: '🏆',
      xp,
      duration: 5000,
    });
  };

  const showLevelUp = (level: number) => {
    showToast({
      type: 'level_up',
      title: '⬆️ Level Up!',
      message: `Congratulations! You reached Level ${level}!`,
      icon: '⬆️',
      level,
      duration: 5000,
    });
  };

  const showStreak = (days: number) => {
    showToast({
      type: 'streak',
      title: '🔥 Streak Milestone!',
      message: `${days} day streak! Keep it going!`,
      icon: '🔥',
      duration: 4000,
    });
  };

  const showHarvest = (tasksExecuted: number) => {
    showToast({
      type: 'harvest',
      title: '🌾 Harvest Complete!',
      message: `${tasksExecuted} task${tasksExecuted > 1 ? 's' : ''} executed overnight`,
      icon: '🌾',
      duration: 4000,
    });
  };

  const dismiss = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const dismissAll = () => {
    setToasts([]);
  };

  return {
    toasts,
    showToast,
    showXP,
    showAchievement,
    showLevelUp,
    showStreak,
    showHarvest,
    dismiss,
    dismissAll,
  };
}
