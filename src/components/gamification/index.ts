/**
 * Gamification Components
 *
 * Export all gamification-related components for easy importing.
 */

// Core Components
export { XPFloat, useXPFloat } from './XPFloat';
export { LevelUpCelebration } from './LevelUpCelebration';
export { AchievementUnlock, useAchievementUnlock } from './AchievementUnlock';
export { StreakVisualization } from './StreakVisualization';
export { CircularProgress, AnimatedCounter } from './CircularProgress';
export {
  GamificationToast,
  GamificationToastContainer,
  useGamificationToasts,
} from './GamificationToast';

// Integration Examples
export { GamifiedAchievementPanel, useHarvestCompletion } from './GamifiedDashboard';
export {
  GamifiedVoiceChatWrapper,
  GamifiedRecordButton,
  GamifiedMessageBubble,
  GamifiedOpportunityCard,
  useXPTracker,
  useStreakTracker,
} from './GamifiedVoiceChat';

// Sound Effects (Optional)
export {
  useSoundEffects,
  useSyntheticSounds,
  SoundSettings,
} from './SoundEffects';

// Types
export type { Toast } from './GamificationToast';
