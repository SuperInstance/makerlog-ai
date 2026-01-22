/**
 * useKeyboardShortcuts Hook
 *
 * Provides keyboard shortcuts for common actions.
 */

import { useEffect } from 'react';

export type ShortcutHandler = (event: KeyboardEvent) => void;

export interface ShortcutMap {
  [key: string]: ShortcutHandler;
}

export function useKeyboardShortcuts(shortcuts: ShortcutMap, enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.contentEditable === 'true'
      ) {
        return;
      }

      const key = event.key.toLowerCase();
      const modifiers = {
        ctrl: event.ctrlKey,
        meta: event.metaKey,
        shift: event.shiftKey,
        alt: event.altKey,
      };

      // Build shortcut key string
      let shortcutKey = '';
      if (modifiers.ctrl) shortcutKey += 'ctrl+';
      if (modifiers.meta) shortcutKey += 'meta+';
      if (modifiers.shift) shortcutKey += 'shift+';
      if (modifiers.alt) shortcutKey += 'alt+';
      shortcutKey += key;

      const handler = shortcuts[shortcutKey];
      if (handler) {
        event.preventDefault();
        handler(event);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts, enabled]);
}

/**
 * Common shortcuts for the app
 */
export const COMMON_SHORTCUTS = {
  // Recording shortcuts
  ' ': 'Toggle recording (space)',

  // Navigation
  'ctrl+k': 'Focus search',
  'ctrl+shift+k': 'Focus daily log',
  'ctrl+shift+a': 'Focus achievements',
  'ctrl+shift+q': 'Focus quota',

  // Actions
  'ctrl+n': 'New conversation',
  'ctrl+shift+n': 'Toggle opportunities',
  'escape': 'Close panel / clear selection',

  // Help
  'ctrl+/': 'Show shortcuts help',
} as const;
