# Gamification Components

Delightful gamification polish and micro-interactions for Makerlog.ai.

## Features

### 1. **XP Float Animations** (`XPFloat.tsx`)
Floating +XP numbers that appear when XP is earned, with smooth upward fade-out animation.

```tsx
import { useXPFloat } from './components/gamification';

function MyComponent() {
  const { showXP, showXPMultiple, XPFloatContainer } = useXPFloat();

  return (
    <>
      <button onClick={() => showXP(50)}>Earn 50 XP</button>
      <button onClick={() => showXPMultiple(100, 3)}>Earn 100 XP (3x burst)</button>
      <XPFloatContainer />
    </>
  );
}
```

### 2. **Level Up Celebration** (`LevelUpCelebration.tsx`)
Dramatic level up animation with flash effect, radial burst, and floating level number.

```tsx
import { LevelUpCelebration } from './components/gamification';

function MyComponent() {
  const [showLevelUp, setShowLevelUp] = useState(false);

  return (
    <>
      <button onClick={() => setShowLevelUp(true)}>Trigger Level Up</button>
      {showLevelUp && (
        <LevelUpCelebration
          level={5}
          onComplete={() => setShowLevelUp(false)}
        />
      )}
    </>
  );
}
```

### 3. **Achievement Unlock** (`AchievementUnlock.tsx`)
Card flip animation with shine effect when achievements are unlocked.

```tsx
import { useAchievementUnlock } from './components/gamification';

function MyComponent() {
  const { showAchievement, AchievementQueue } = useAchievementUnlock();

  return (
    <>
      <button onClick={() => showAchievement({
        id: '1',
        name: 'First Harvest',
        description: 'Complete your first harvest',
        icon: '🌾',
        xp: 100,
      })}>
        Unlock Achievement
      </button>
      <AchievementQueue />
    </>
  );
}
```

### 4. **Streak Visualization** (`StreakVisualization.tsx`)
Animated flame icon that grows with streak, calendar heatmap, and encouragement messages.

```tsx
import { StreakVisualization } from './components/gamification';

function MyComponent() {
  return (
    <StreakVisualization
      streakDays={14}
      lastHarvestAt={Date.now() - 1000 * 60 * 60 * 2} // 2 hours ago
    />
  );
}
```

### 5. **Circular Progress** (`CircularProgress.tsx`)
Animated circular progress indicator for quota usage with "on fire" state.

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
      <AnimatedCounter value={1234} prefix="$" suffix=".00" />
    </>
  );
}
```

### 6. **Gamification Toast** (`GamificationToast.tsx`)
Toast notifications for achievements, XP gains, level ups with slide animations.

```tsx
import { useGamificationToasts, GamificationToastContainer } from './components/gamification';

function MyComponent() {
  const { toasts, showXP, showAchievement, showLevelUp, dismissAll } = useGamificationToasts();

  return (
    <>
      <button onClick={() => showXP(50, 'Task Completion')}>Show XP Toast</button>
      <button onClick={() => showAchievement('First Harvest', 100, 'Complete your first harvest')}>
        Show Achievement
      </button>
      <button onClick={() => showLevelUp(5)}>Show Level Up</button>
      <GamificationToastContainer toasts={toasts} onDismiss={dismiss} position="top-right" />
    </>
  );
}
```

## Integration with Dashboard

To integrate gamification into the Dashboard component:

```tsx
import { GamifiedAchievementPanel } from './components/gamification';

// In Dashboard.tsx, replace:
<AchievementPanel user={user} achievements={achievements} />

// With:
<GamifiedAchievementPanel
  user={user}
  achievements={achievements}
  onXPChange={(newXP, oldXP) => {
    // Handle XP changes, trigger animations
  }}
/>
```

## Harvest Completion Handler

To trigger gamification effects when harvest completes:

```tsx
import { useHarvestCompletion } from './components/gamification';

function Dashboard() {
  const { handleHarvestComplete } = useHarvestCompletion();

  const handleHarvest = async () => {
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
}
```

## Styling and Customization

All components use Tailwind CSS and can be customized via props:

- **Colors**: Use `color` prop with `'blue' | 'purple' | 'green' | 'orange' | 'red'`
- **Sizes**: Use `size` prop for pixel dimensions
- **Durations**: Use `duration` prop for animation timing
- **Positions**: Use `position` prop for toast placement

## Accessibility

All components include:

- ARIA labels and roles
- Keyboard navigation support
- Screen reader announcements
- Focus indicators
- Reduced motion support (via CSS `@media (prefers-reduced-motion: reduce)`)

## Performance

- Animations use CSS transforms and opacity (GPU-accelerated)
- Auto-cleanup after animations complete
- Minimal re-renders with proper React hooks
- No external animation libraries required

## Sound Effects (Optional)

To enable sound effects:

```tsx
const playSound = (type: 'achievement' | 'level_up' | 'xp') => {
  const audio = new Audio(`/sounds/${type}.mp3`);
  audio.volume = 0.3; // 30% volume
  audio.play().catch(() => {
    // Auto-play was prevented, ignore
  });
};

// Call in your celebration handlers
```

Place sound files in `/public/sounds/`:
- `achievement.mp3`
- `level_up.mp3`
- `xp.mp3`

## Browser Compatibility

- **Modern browsers**: Full support
- **Mobile**: Full support (iOS Safari 14.5+, Chrome Android)
- **Haptics**: Supported on Android, limited iOS support
- **Reduced motion**: Respects user preferences

## License

MIT
