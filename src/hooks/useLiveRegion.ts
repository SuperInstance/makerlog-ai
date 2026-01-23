/**
 * Live Region Utilities
 * WCAG 2.2 AAA compliant screen reader announcements
 */

import { useRef, useEffect } from 'react';

/**
 * Announce dynamic content changes to screen readers
 */
export function useLiveRegion() {
  const liveRegionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Create live region if it doesn't exist
    if (!liveRegionRef.current) {
      const region = document.createElement('div');
      region.setAttribute('role', 'status');
      region.setAttribute('aria-live', 'polite');
      region.setAttribute('aria-atomic', 'true');
      region.className = 'sr-only';
      document.body.appendChild(region);
      liveRegionRef.current = region;
    }

    return () => {
      if (liveRegionRef.current && liveRegionRef.current.parentNode) {
        liveRegionRef.current.parentNode.removeChild(liveRegionRef.current);
      }
    };
  }, []);

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (!liveRegionRef.current) return;

    liveRegionRef.current.setAttribute('aria-live', priority);
    liveRegionRef.current.textContent = '';

    // Use setTimeout to clear and set text to ensure screen readers pick up the change
    setTimeout(() => {
      if (liveRegionRef.current) {
        liveRegionRef.current.textContent = message;
      }
    }, 100);
  }, []);

  return { announce };
}

/**
 * Live region component for inline announcements
 */
export function LiveRegion({
  message,
  priority = 'polite',
  clearAfter = 0
}: {
  message: string;
  priority?: 'polite' | 'assertive';
  clearAfter?: number;
}) {
  const regionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (clearAfter > 0 && regionRef.current) {
      const timeout = setTimeout(() => {
        if (regionRef.current) {
          regionRef.current.textContent = '';
        }
      }, clearAfter);

      return () => clearTimeout(timeout);
    }
  }, [message, clearAfter]);

  return (
    <div
      ref={regionRef}
      role="status"
      aria-live={priority}
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  );
}

/**
 * Hook for announcing status changes
 */
export function useStatusAnnouncer() {
  const { announce } = useLiveRegion();

  const announceStatus = useCallback((
    message: string,
    options?: { priority?: 'polite' | 'assertive'; clearTimeout?: number }
  ) => {
    announce(message, options?.priority || 'polite');
  }, [announce]);

  return { announceStatus };
}

/**
 * Hook for announcing errors to screen readers
 */
export function useErrorAnnouncer() {
  const { announce } = useLiveRegion();

  const announceError = useCallback((message: string) => {
    announce(`Error: ${message}`, 'assertive');
  }, [announce]);

  return { announceError };
}

/**
 * Hook for announcing progress updates
 */
export function useProgressAnnouncer() {
  const { announce } = useLiveRegion();

  const announceProgress = useCallback((
    current: number,
    total: number,
    label: string
  ) => {
    const percentage = Math.round((current / total) * 100);
    announce(`${label}: ${percentage}% complete`, 'polite');
  }, [announce]);

  return { announceProgress };
}
