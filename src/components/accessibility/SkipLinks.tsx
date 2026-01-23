/**
 * Skip Links Component
 * WCAG 2.2 AAA compliant skip navigation
 */

import React from 'react';

interface SkipLink {
  targetId: string;
  label: string;
}

interface SkipLinksProps {
  links: SkipLink[];
}

export function SkipLinks({ links }: SkipLinksProps) {
  return (
    <div className="sr-only">
      {links.map((link) => (
        <a
          key={link.targetId}
          href={`#${link.targetId}`}
          onClick={(e) => {
            e.preventDefault();
            const target = document.getElementById(link.targetId);
            if (target) {
              target.focus();
              target.scrollIntoView({ behavior: 'smooth' });
            }
          }}
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-blue-500 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lg focus:font-medium"
        >
          {link.label}
        </a>
      ))}
    </div>
  );
}

/**
 * Default skip links for Makerlog.ai
 */
export function DefaultSkipLinks() {
  return (
    <SkipLinks
      links={[
        { targetId: 'main-content', label: 'Skip to main content' },
        { targetId: 'sidebar', label: 'Skip to conversations' },
        { targetId: 'record-button', label: 'Skip to record button' },
      ]}
    />
  );
}
