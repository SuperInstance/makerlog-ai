/**
 * Gamified Voice Chat Integration Example
 *
 * This file demonstrates how to integrate gamification components
 * into the existing VoiceChat.tsx component.
 *
 * Key Integration Points:
 * 1. Import gamification components
 * 2. Add to state management
 * 3. Trigger on events (recording complete, harvest, etc.)
 * 4. Render toast container
 */

import React, { useState, useEffect } from 'react';
import {
  useXPFloat,
  useGamificationToasts,
  LevelUpCelebration,
  GamificationToastContainer,
} from '../gamification';

// Example: Add gamification to VoiceChat component
export function GamifiedVoiceChatWrapper({
  children,
  currentLevel,
  currentXP,
  streakDays,
}: {
  children: React.ReactNode;
  currentLevel: number;
  currentXP: number;
  streakDays: number;
}) {
  const [previousLevel, setPreviousLevel] = useState(currentLevel);
  const [showLevelUp, setShowLevelUp] = useState(false);

  const { showXP, XPFloatContainer } = useXPFloat();
  const { toasts, showXP: showToastXP, showStreak, dismiss } = useGamificationToasts();

  // Check for level up
  useEffect(() => {
    if (currentLevel > previousLevel) {
      setShowLevelUp(true);
      setPreviousLevel(currentLevel);
    }
  }, [currentLevel, previousLevel]);

  // Handle recording completion with XP reward
  const handleRecordingComplete = (xpEarned: number) => {
    // Show floating XP animation
    showXP(xpEarned);

    // Show toast notification
    showToastXP(xpEarned, 'Voice Recording');

    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(30);
    }
  };

  // Handle streak milestones
  const checkStreakMilestone = () => {
    const milestones = [3, 7, 14, 21, 30, 60, 100];
    if (milestones.includes(streakDays)) {
      showStreak(streakDays);
    }
  };

  return (
    <>
      {children}

      {/* Gamification Overlays */}
      {showLevelUp && (
        <LevelUpCelebration
          level={currentLevel}
          onComplete={() => setShowLevelUp(false)}
        />
      )}

      {/* XP Float Container */}
      <XPFloatContainer />

      {/* Toast Container */}
      <GamificationToastContainer
        toasts={toasts}
        onDismiss={dismiss}
        position="top-right"
      />
    </>
  );
}

/**
 * Example: Enhanced Record Button with Feedback
 */
export function GamifiedRecordButton({
  isRecording,
  isProcessing,
  onStart,
  onStop,
  xpPerRecording = 10,
}: {
  isRecording: boolean;
  isProcessing: boolean;
  onStart: () => void;
  onStop: () => void;
  xpPerRecording?: number;
}) {
  const { showXP, XPFloatContainer } = useXPFloat();

  const handleStop = () => {
    onStop();
    // Reward XP for recording
    setTimeout(() => {
      showXP(xpPerRecording);
    }, 500);
  };

  return (
    <div className="relative">
      <button
        onMouseDown={onStart}
        onMouseUp={handleStop}
        onTouchStart={onStart}
        onTouchEnd={handleStop}
        disabled={isProcessing}
        className={`
          w-24 h-24 rounded-full flex items-center justify-center
          transition-all duration-200 select-none
          ${isRecording
            ? 'bg-red-500 scale-110 shadow-lg shadow-red-500/50 animate-pulse'
            : isProcessing
              ? 'bg-slate-600 cursor-not-allowed'
              : 'bg-blue-500 hover:bg-blue-400 hover:scale-105 active:scale-95'
          }
        `}
      >
        {isProcessing ? (
          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
            <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
          </svg>
        )}
      </button>

      {/* XP Float Container */}
      <XPFloatContainer />
    </div>
  );
}

/**
 * Example: Gamified Message Bubble with XP
 */
export function GamifiedMessageBubble({
  message,
  xpReward = 0,
}: {
  message: { id: string; content: string; role: 'user' | 'assistant' };
  xpReward?: number;
}) {
  const [showedXP, setShowedXP] = useState(false);
  const { showXP, XPFloatContainer } = useXPFloat();

  useEffect(() => {
    if (xpReward > 0 && !showedXP) {
      setTimeout(() => {
        showXP(xpReward);
        setShowedXP(true);
      }, 1000);
    }
  }, [xpReward, showedXP, showXP]);

  const isUser = message.role === 'user';

  return (
    <div className="relative">
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-lg ${
          isUser
            ? 'bg-blue-500 text-white rounded-br-md'
            : 'bg-slate-700 text-white rounded-bl-md'
        }`}
      >
        <p className="text-sm leading-relaxed break-words">{message.content}</p>

        {/* XP indicator */}
        {xpReward > 0 && !showedXP && (
          <div className="text-xs text-yellow-400 mt-1 flex items-center gap-1">
            <span>⭐</span>
            <span>+{xpReward} XP</span>
          </div>
        )}
      </div>

      <XPFloatContainer />
    </div>
  );
}

/**
 * Example: Opportunity Card with XP Preview
 */
export function GamifiedOpportunityCard({
  opportunity,
  onQueue,
  xpReward = 50,
}: {
  opportunity: { id: string; type: string; prompt: string; confidence: number };
  onQueue: () => void;
  xpReward?: number;
}) {
  const { showXP, XPFloatContainer } = useXPFloat();

  const handleQueue = () => {
    onQueue();
    // Show XP preview (will be actually earned when task completes)
    setTimeout(() => {
      showXP(xpReward);
    }, 300);
  };

  const typeIcons = {
    image: '🎨',
    code: '💻',
    text: '📝',
    audio: '🎵',
  };

  return (
    <div className="relative bg-slate-800 rounded-lg p-4 mb-3 slide-in-right shadow-lg hover:shadow-xl transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">{typeIcons[opportunity.type as keyof typeof typeIcons]}</span>
          <span className="text-sm font-medium text-white capitalize">
            {opportunity.type} Generation
          </span>
        </div>
        <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full font-medium">
          {Math.round(opportunity.confidence * 100)}% match
        </span>
      </div>

      <p className="text-sm text-slate-300 mb-3 line-clamp-2">
        {opportunity.prompt}
      </p>

      <div className="flex items-center justify-between">
        <div className="text-xs text-yellow-400 flex items-center gap-1">
          <span>⭐</span>
          <span>+{xpReward} XP when completed</span>
        </div>
        <button
          onClick={handleQueue}
          className="text-xs bg-green-500 hover:bg-green-400 text-white py-2 px-3 rounded transition btn-press focus-ring min-h-[44px] font-medium"
        >
          Queue for Tonight
        </button>
      </div>

      <XPFloatContainer />
    </div>
  );
}

/**
 * Hook: Track and award XP for activities
 */
export function useXPTracker() {
  const [totalXP, setTotalXP] = useState(0);
  const [recentActivities, setRecentActivities] = useState<Array<{ id: string; type: string; xp: number; timestamp: number }>>([]);

  const awardXP = (type: string, amount: number) => {
    const activity = {
      id: crypto.randomUUID(),
      type,
      xp: amount,
      timestamp: Date.now(),
    };

    setTotalXP((prev) => prev + amount);
    setRecentActivities((prev) => [activity, ...prev].slice(0, 10));

    return activity;
  };

  const getXPBreakdown = () => {
    return recentActivities.reduce((acc, activity) => {
      acc[activity.type] = (acc[activity.type] || 0) + activity.xp;
      return acc;
    }, {} as Record<string, number>);
  };

  return {
    totalXP,
    recentActivities,
    awardXP,
    getXPBreakdown,
  };
}

/**
 * Hook: Track streak and encourage consistency
 */
export function useStreakTracker(lastHarvestAt?: number) {
  const [streakDays, setStreakDays] = useState(0);
  const [lastActivity, setLastActivity] = useState(lastHarvestAt || Date.now());

  const updateActivity = () => {
    const now = Date.now();
    const hoursSinceLastActivity = (now - lastActivity) / (1000 * 60 * 60);

    if (hoursSinceLastActivity < 48) {
      // Within 48 hours = streak continues
      setStreakDays((prev) => prev + 1);
    } else if (hoursSinceLastActivity > 48) {
      // Streak broken
      setStreakDays(1);
    }

    setLastActivity(now);
  };

  const isAtRisk = () => {
    const hoursSinceLastActivity = (Date.now() - lastActivity) / (1000 * 60 * 60);
    return hoursSinceLastActivity > 20;
  };

  return {
    streakDays,
    updateActivity,
    isAtRisk,
  };
}
