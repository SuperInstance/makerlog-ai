# Gamification Quick Start Guide

## 1. Install & Import

```tsx
// Import what you need
import {
  // Core components
  XPFloat,
  LevelUpCelebration,
  AchievementUnlock,
  StreakVisualization,
  CircularProgress,
  GamificationToast,
  GamificationToastContainer,

  // Hooks
  useXPFloat,
  useGamificationToasts,
  useAchievementUnlock,
  useHarvestCompletion,

  // Integration helpers
  GamifiedAchievementPanel,
  GamifiedVoiceChatWrapper,

  // Sound effects (optional)
  useSyntheticSounds,
  SoundSettings,
} from './components/gamification';
```

## 2. Basic XP Animation

```tsx
function MyComponent() {
  const { showXP, XPFloatContainer } = useXPFloat();

  return (
    <>
      <button onClick={() => showXP(50)}>Earn 50 XP</button>
      <XPFloatContainer />
    </>
  );
}
```

## 3. Level Up Celebration

```tsx
function MyComponent() {
  const [level, setLevel] = useState(1);
  const [showLevelUp, setShowLevelUp] = useState(false);

  const addXP = (amount: number) => {
    // Check if level up
    if (shouldLevelUp(amount)) {
      setShowLevelUp(true);
      setLevel(prev => prev + 1);
    }
  };

  return (
    <>
      <button onClick={() => addXP(100)}>Add 100 XP</button>
      {showLevelUp && (
        <LevelUpCelebration
          level={level}
          onComplete={() => setShowLevelUp(false)}
        />
      )}
    </>
  );
}
```

## 4. Toast Notifications

```tsx
function MyComponent() {
  const { toasts, showXP, showAchievement, dismiss } = useGamificationToasts();

  return (
    <>
      <button onClick={() => showXP(50, 'Task Complete')}>Show XP</button>
      <button onClick={() => showAchievement('First Harvest', 100, 'Complete your first harvest')}>
        Show Achievement
      </button>
      <GamificationToastContainer
        toasts={toasts}
        onDismiss={dismiss}
        position="top-right"
      />
    </>
  );
}
```

## 5. Dashboard Integration

```tsx
// In Dashboard.tsx, replace AchievementPanel:

import { GamifiedAchievementPanel } from './components/gamification';

// Old:
<AchievementPanel user={user} achievements={achievements} />

// New:
<GamifiedAchievementPanel
  user={user}
  achievements={achievements}
  onXPChange={(newXP, oldXP) => {
    // Optional: Handle XP changes
  }}
/>
```

## 6. Harvest Completion

```tsx
import { useHarvestCompletion } from './components/gamification';

function Dashboard() {
  const { handleHarvestComplete } = useHarvestCompletion();

  const onHarvest = async () => {
    const result = await fetch('/api/harvest', { method: 'POST' });
    const data = await result.json();

    // Trigger all gamification effects
    handleHarvestComplete({
      tasksExecuted: data.tasksExecuted,
      xpEarned: data.xpEarned,
      newAchievements: data.newAchievements,
      newLevel: data.newLevel,
    });
  };

  return <button onClick={onHarvest}>Harvest</button>;
}
```

## 7. Streak Visualization

```tsx
import { StreakVisualization } from './components/gamification';

function MyComponent() {
  return (
    <StreakVisualization
      streakDays={14}
      lastHarvestAt={Date.now() - 1000 * 60 * 60 * 2}
    />
  );
}
```

## 8. Circular Progress

```tsx
import { CircularProgress, AnimatedCounter } from './components/gamification';

function MyComponent() {
  return (
    <>
      <CircularProgress
        percentage={85}
        size={120}
        strokeWidth={10}
        label="Daily Quota"
        showFire={true}
        color="orange"
      />
      <AnimatedCounter value={1234} />
    </>
  );
}
```

## 9. Sound Effects (Optional)

```tsx
import { useSyntheticSounds } from './components/gamification';

function MyComponent() {
  const { enabled, setEnabled, playAchievement, playLevelUp } = useSyntheticSounds();

  return (
    <>
      <button onClick={() => setEnabled(!enabled)}>
        {enabled ? 'Disable' : 'Enable'} Sounds
      </button>
      <button onClick={() => playAchievement()}>Play Achievement Sound</button>
      <button onClick={() => playLevelUp()}>Play Level Up Sound</button>
    </>
  );
}
```

## 10. Common Patterns

### XP on Action Complete
```tsx
const { showXP, XPFloatContainer } = useXPFloat();

const handleTaskComplete = (xpReward: number) => {
  // ... your logic
  showXP(xpReward);
};

return (
  <>
    <Task onComplete={handleTaskComplete} />
    <XPFloatContainer />
  </>
);
```

### Achievement Unlock
```tsx
const { showAchievement, AchievementQueue } = useAchievementUnlock();

const unlockAchievement = (achievement) => {
  // ... your logic
  showAchievement(achievement);
};

return (
  <>
    <Button onClick={() => unlockAchievement({...})} />
    <AchievementQueue />
  </>
);
```

### Level Up Check
```tsx
const [level, setLevel] = useState(1);
const [showLevelUp, setShowLevelUp] = useState(false);

useEffect(() => {
  if (currentLevel > level) {
    setShowLevelUp(true);
  }
}, [currentLevel, level]);

return (
  <>
    {showLevelUp && (
      <LevelUpCelebration
        level={currentLevel}
        onComplete={() => setShowLevelUp(false)}
      />
    )}
  </>
);
```

## Quick Reference

| Hook/Component | Purpose | Usage |
|----------------|---------|-------|
| `useXPFloat()` | Floating XP animations | `showXP(amount)` |
| `useGamificationToasts()` | Toast notifications | `showXP()`, `showAchievement()`, etc. |
| `useAchievementUnlock()` | Achievement cards | `showAchievement(achievement)` |
| `useHarvestCompletion()` | Harvest effects | `handleHarvestComplete(result)` |
| `useSyntheticSounds()` | Sound effects | `playAchievement()`, `playLevelUp()` |
| `GamifiedAchievementPanel` | Enhanced dashboard | Replace `AchievementPanel` |
| `StreakVisualization` | Streak display | `<StreakVisualization streakDays={7} />` |
| `CircularProgress` | Progress circle | `<CircularProgress percentage={80} />` |
| `LevelUpCelebration` | Level up effect | `<LevelUpCelebration level={5} />` |

## CSS Classes

New animation classes available:
- `.slide-in-left`, `.slide-in-up`, `.slide-in-down`
- `.bounce-in`, `.scale-out`
- `.shake` (for errors)
- `.pulse-glow` (for important items)
- `.shimmer` (for loading)
- `.fire-effect` (for "on fire" state)
- `.xp-float`, `.level-burst`, `.card-flip`

## Tips

1. **Always render containers**: `XPFloatContainer`, `AchievementQueue`, `GamificationToastContainer`
2. **Cleanup is automatic**: Components auto-remove after animations
3. **Respect preferences**: Reduced motion is automatically handled
4. **Test haptics**: Use real devices for haptic feedback testing
5. **Keep it subtle**: Don't overdo animations, maintain professional feel

## Need Help?

See `/docs/GAMIFICATION-IMPLEMENTATION.md` for detailed documentation.
See `/src/components/gamification/README.md` for component API docs.
