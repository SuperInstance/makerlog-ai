/**
 * Visually Hidden Component
 * WCAG 2.2 AAA compliant screen reader-only content
 */

import React from 'react';

interface VisuallyHiddenProps {
  children: React.ReactNode;
  as?: React.ElementType;
  focusable?: 'inherit' | 'always' | 'never';
}

export function VisuallyHidden({
  children,
  as: Component = 'span',
  focusable = 'inherit'
}: VisuallyHiddenProps) {
  const baseClasses = 'sr-only';

  const focusableClasses = {
    inherit: '',
    always: 'focus:not-sr-only focus:absolute focus:z-50',
    never: 'focus:sr-only',
  }[focusable];

  return (
    <Component className={`${baseClasses} ${focusableClasses}`}>
      {children}
    </Component>
  );
}

/**
 * Screen reader-only text component
 */
export function SrOnly({ children }: { children: React.ReactNode }) {
  return (
    <span className="sr-only">
      {children}
    </span>
  );
}

/**
 * Focus indicator utility - visible only when focused
 */
export function FocusOnly({ children }: { children: React.ReactNode }) {
  return (
    <span className="sr-only focus:not-sr-only">
      {children}
    </span>
  );
}
