/**
 * Focus Management Utilities
 * WCAG 2.2 AAA compliant focus management
 */

import { useRef, useEffect, useCallback } from 'react';

/**
 * Trap focus within a container (for modals, dropdowns, etc.)
 */
export function useFocusTrap(isActive: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    // Focus first element when trap activates
    firstElement?.focus();

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    container.addEventListener('keydown', handleTab);
    return () => container.removeEventListener('keydown', handleTab);
  }, [isActive]);

  return containerRef;
}

/**
 * Restore focus to previously focused element
 */
export function useFocusRestore(isActive: boolean, onClose?: () => void) {
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isActive) {
      // Store the currently focused element
      previousFocusRef.current = document.activeElement as HTMLElement;

      return () => {
        // Restore focus when deactivated
        if (previousFocusRef.current) {
          previousFocusRef.current.focus();
        }
        onClose?.();
      };
    }
  }, [isActive, onClose]);
}

/**
 * Manage focus for elements that appear/disappear
 */
export function useAutoFocus(isActive: boolean, delay = 0) {
  const elementRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (isActive && elementRef.current) {
      const timeout = setTimeout(() => {
        elementRef.current?.focus();
      }, delay);

      return () => clearTimeout(timeout);
    }
  }, [isActive, delay]);

  return elementRef;
}

/**
 * Return focus to a specific element after an action
 */
export function useReturnFocus<T extends HTMLElement>() {
  const elementRef = useRef<T>(null);

  const returnFocus = useCallback(() => {
    elementRef.current?.focus();
  }, []);

  return [elementRef, returnFocus] as const;
}

/**
 * Skip to main content link implementation
 */
export function SkipLink({ targetId, children }: { targetId: string; children: React.ReactNode }) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      target.focus();
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <a
      href={`#${targetId}`}
      onClick={handleClick}
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-blue-500 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg"
    >
      {children}
    </a>
  );
}
