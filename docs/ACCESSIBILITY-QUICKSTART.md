# Accessibility Integration Quickstart

This guide shows how to integrate accessibility features into Makerlog.ai components.

## Step 1: Import Accessibility Hooks

```typescript
// In your component
import { useFocusTrap, useFocusRestore } from './hooks/useFocusManager';
import { useStatusAnnouncer, useErrorAnnouncer } from './hooks/useLiveRegion';
import { useKeyboardShortcuts, useDefaultShortcuts } from './hooks/useKeyboardShortcuts';
```

## Step 2: Add Keyboard Shortcuts

```typescript
// Define actions for shortcuts
const actions = {
  newConversation: () => createNewConversation(),
  toggleSearch: () => setShowSearch(!showSearch),
  toggleOpportunities: () => setShowOpportunities(!showOpportunities),
  toggleQuota: () => setShowQuota(!showQuota),
  toggleGamification: () => setShowGamification(!showGamification),
  toggleDailyLog: () => setShowDailyLog(!showDailyLog),
  showHelp: () => setShowHelp(true),
  focusRecord: () => recordButtonRef.current?.focus(),
};

// Setup shortcuts
const shortcuts = useDefaultShortcuts(actions);
useKeyboardShortcuts(shortcuts);
```

## Step 3: Add Focus Management

```typescript
// For modals
const modalRef = useFocusTrap(isModalOpen);
useFocusRestore(isModalOpen, () => setIsModalOpen(false));

// For auto-focus
const inputRef = useAutoFocus(isModalOpen);
```

## Step 4: Add Screen Reader Announcements

```typescript
// Status announcements
const { announceStatus } = useStatusAnnouncer();

announceStatus('Recording started');
announceStatus('Task completed');

// Error announcements
const { announceError } = useErrorAnnouncer();

announceError('Failed to upload audio');
```

## Step 5: Use Accessible Components

```typescript
import { SkipLinks, HelpModal, VisuallyHidden } from './components/accessibility';

// Add skip links
<SkipLinks
  links={[
    { targetId: 'main-content', label: 'Skip to main content' },
    { targetId: 'sidebar', label: 'Skip to conversations' },
  ]}
/>

// Add help modal
<HelpModal
  isOpen={showHelp}
  onClose={() => setShowHelp(false)}
  shortcuts={shortcuts}
/>

// Add visually hidden content
<VisuallyHidden>
  <span>Additional context for screen readers</span>
</VisuallyHidden>
```

## Step 6: Apply Accessibility Classes

```tsx
// Button
<button className="btn-primary min-h-[44px] focus-ring">
  Click me
</button>

// Input
<input
  type="text"
  className="form-input"
  aria-label="Search conversations"
  aria-describedby="search-hint"
/>
<p id="search-hint" className="form-hint">
  Search by meaning, not just keywords
</p>

// Progress bar
<div
  role="progressbar"
  aria-valuenow={75}
  aria-valuemin={0}
  aria-valuemax={100}
  aria-label="Upload progress"
  className="progress-bar"
>
  <div className="progress-value" style={{ width: '75%' }} />
</div>
```

## Step 7: Add ARIA Attributes

```tsx
// Live regions for dynamic content
<div
  role="status"
  aria-live="polite"
  aria-atomic="true"
  className="sr-only"
>
  {statusMessage}
</div>

// Alert for errors
<div
  role="alert"
  aria-live="assertive"
  aria-atomic="true"
>
  {errorMessage}
</div>

// Landmark roles
<nav aria-label="Main navigation">
  {/* Navigation items */}
</nav>

<main id="main-content">
  {/* Main content */}
</main>

<aside aria-label="Conversation history">
  {/* Sidebar content */}
</aside>
```

## Step 8: Keyboard Event Handlers

```tsx
// Keyboard recording
const handleKeyDown = (e: React.KeyboardEvent) => {
  if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault();
    if (!isRecording) {
      startRecording();
    } else {
      stopRecording();
    }
  }

  if (e.key === 'Escape' && isRecording) {
    e.preventDefault();
    cancelRecording();
  }
};

<button
  onKeyDown={handleKeyDown}
  aria-label={isRecording ? 'Stop recording' : 'Start recording'}
  aria-pressed={isRecording}
>
  Record
</button>
```

## Step 9: Testing Checklist

- [ ] Navigate entire interface with keyboard (Tab, Shift+Tab, Enter, Escape)
- [ ] Verify focus indicators are visible
- [ ] Test with screen reader (NVDA/JAWS/VoiceOver)
- [ ] Check color contrast with axe DevTools
- [ ] Test in high contrast mode
- [ ] Test with reduced motion preference
- [ ] Verify all ARIA labels are descriptive
- [ ] Test skip links
- [ ] Verify keyboard shortcuts work
- [ ] Test focus trap in modals

## Common Patterns

### Accessible Button

```tsx
<button
  onClick={handleClick}
  disabled={isDisabled}
  aria-label="Clear search"
  aria-busy={isLoading}
  className="btn-ghost min-h-[44px] focus-ring"
>
  {isLoading ? 'Loading...' : 'Clear'}
</button>
```

### Accessible Form

```tsx
<form onSubmit={handleSubmit}>
  <div>
    <label htmlFor="email" className="form-label">
      Email address
    </label>
    <input
      id="email"
      type="email"
      required
      className="form-input"
      aria-invalid={hasError}
      aria-describedby={hasError ? 'email-error' : 'email-hint'}
    />
    {!hasError && (
      <p id="email-hint" className="form-hint">
        We'll never share your email
      </p>
    )}
    {hasError && (
      <p id="email-error" className="form-error" role="alert">
        {errorMessage}
      </p>
    )}
  </div>
</form>
```

### Accessible Modal

```tsx
const modalRef = useFocusTrap(isOpen);
useFocusRestore(isOpen);

<div
  ref={modalRef}
  role="dialog"
  aria-modal="true"
  aria-labelledby="modal-title"
  aria-describedby="modal-description"
  className="modal-backdrop"
>
  <div className="modal-content">
    <h2 id="modal-title">Modal Title</h2>
    <p id="modal-description">Modal description</p>
    {/* Content */}
  </div>
</div>
```

### Accessible List

```tsx
<ul role="list" aria-label="Conversations">
  {items.map((item, index) => (
    <li key={item.id}>
      <button
        role="option"
        aria-selected={selectedId === item.id}
        aria-setsize={items.length}
        aria-posinset={index + 1}
        onClick={() => onSelect(item.id)}
        className="focus-ring min-h-[44px]"
      >
        {item.title}
      </button>
    </li>
  ))}
</ul>
```

## Resources

- [Full Accessibility Guide](./ACCESSIBILITY-IMPLEMENTATION.md)
- [WCAG 2.2 Quick Reference](https://www.w3.org/WAI/WCAG22/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)

## Support

For questions or issues, refer to the main accessibility documentation or file an issue with detailed reproduction steps.
