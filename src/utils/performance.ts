/**
 * Performance monitoring utilities for Makerlog.ai
 *
 * Tracks Web Vitals and custom performance metrics.
 */

import React from 'react';

export interface PerformanceMetrics {
  // Core Web Vitals
  fcp?: number; // First Contentful Paint
  lcp?: number; // Largest Contentful Paint
  fid?: number; // First Input Delay
  cls?: number; // Cumulative Layout Shift
  ttfb?: number; // Time to First Byte

  // Custom metrics
  loadTime?: number; // Page load time
  domReady?: number; // DOM ready time
  firstRender?: number; // First React render
}

/**
 * Track Web Vitals using Performance Observer API
 */
export function trackWebVitals(
  onMetric: (name: string, value: number, rating: 'good' | 'needs-improvement' | 'poor') => void
) {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
    return;
  }

  try {
    // First Contentful Paint
    const fcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const fcpEntry = entries.find(
        (entry): entry is PerformanceEntry & { value?: number } =>
          entry.name === 'first-contentful-paint' && 'value' in entry
      );
      if (fcpEntry && 'value' in fcpEntry && fcpEntry.value !== undefined) {
        const value = fcpEntry.value;
        const rating = getRating('fcp', value);
        onMetric('FCP', value, rating);
      }
    });
    fcpObserver.observe({ entryTypes: ['paint'] });

    // Largest Contentful Paint
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1] as any;
      if (lastEntry?.value) {
        const value = lastEntry.value;
        const rating = getRating('lcp', value);
        onMetric('LCP', value, rating);
      }
    });
    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

    // First Input Delay
    const fidObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      for (const entry of entries) {
        const fidEntry = entry as any;
        if (fidEntry?.processingStart && fidEntry?.startTime) {
          const value = fidEntry.processingStart - fidEntry.startTime;
          const rating = getRating('fid', value);
          onMetric('FID', value, rating);
        }
      }
    });
    fidObserver.observe({ entryTypes: ['first-input'] });

    // Cumulative Layout Shift
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const clsEntry = entry as any;
        if (!clsEntry.hadRecentInput) {
          clsValue += clsEntry.value;
        }
      }
      const rating = getRating('cls', clsValue);
      onMetric('CLS', clsValue, rating);
    });
    clsObserver.observe({ entryTypes: ['layout-shift'] });

    // Time to First Byte
    const ttfbObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      for (const entry of entries) {
        const navEntry = entry as PerformanceNavigationTiming;
        if (navEntry.responseStart > 0) {
          const value = navEntry.responseStart - navEntry.requestStart;
          const rating = getRating('ttfb', value);
          onMetric('TTFB', value, rating);
        }
      }
    });
    ttfbObserver.observe({ entryTypes: ['navigation'] });
  } catch (error) {
    console.warn('Failed to track web vitals:', error);
  }
}

/**
 * Get rating for a metric based on thresholds
 */
function getRating(
  metric: string,
  value: number
): 'good' | 'needs-improvement' | 'poor' {
  const thresholds: Record<string, { good: number; poor: number }> = {
    fcp: { good: 1800, poor: 3000 },
    lcp: { good: 2500, poor: 4000 },
    fid: { good: 100, poor: 300 },
    cls: { good: 0.1, poor: 0.25 },
    ttfb: { good: 800, poor: 1800 },
  };

  const threshold = thresholds[metric];
  if (!threshold) return 'good';

  if (value <= threshold.good) return 'good';
  if (value <= threshold.poor) return 'needs-improvement';
  return 'poor';
}

/**
 * Measure custom performance marks
 */
export function measurePerformance(markName: string, measureName?: string) {
  if (typeof window === 'undefined' || !('performance' in window)) {
    return;
  }

  try {
    if (!performance.getEntriesByName(markName).length) {
      performance.mark(markName);
    }

    if (measureName) {
      performance.measure(measureName, markName);
      const measure = performance.getEntriesByName(measureName)[0];
      return measure?.duration;
    }
  } catch (error) {
    console.warn('Failed to measure performance:', error);
  }
}

/**
 * Get navigation timing metrics
 */
export function getNavigationTiming(): PerformanceMetrics | null {
  if (typeof window === 'undefined' || !('performance' in window)) {
    return null;
  }

  try {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

    if (!navigation) return null;

    return {
      loadTime: navigation.loadEventEnd - navigation.fetchStart,
      domReady: navigation.domContentLoadedEventEnd - navigation.fetchStart,
      ttfb: navigation.responseStart - navigation.requestStart,
    };
  } catch (error) {
    console.warn('Failed to get navigation timing:', error);
    return null;
  }
}

/**
 * Report metrics to analytics (placeholder for actual implementation)
 */
export function reportMetrics(metrics: PerformanceMetrics) {
  // In production, send to your analytics service
  if (import.meta.env.PROD) {
    // Example: Send to Cloudflare Web Analytics or other service
    console.log('Performance metrics:', metrics);
  }
}

/**
 * Debounce function for performance optimization
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function for performance optimization
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Measure React component render time
 */
export function useRenderTime(componentName: string) {
  if (typeof window === 'undefined' || !import.meta.env.DEV) {
    return;
  }

  React.useEffect(() => {
    const startTime = performance.now();
    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      if (renderTime > 16) { // Log if render takes more than one frame (60fps)
        console.warn(`${componentName} took ${renderTime.toFixed(2)}ms to render`);
      }
    };
  });
}

/**
 * Memoization helper with size limit
 */
export function createMemoCache<T>(maxSize = 100) {
  const cache = new Map<string, T>();
  const keys: string[] = [];

  return {
    get(key: string): T | undefined {
      return cache.get(key);
    },
    set(key: string, value: T): void {
      if (cache.size >= maxSize) {
        const oldestKey = keys.shift();
        if (oldestKey) {
          cache.delete(oldestKey);
        }
      }
      cache.set(key, value);
      keys.push(key);
    },
    clear(): void {
      cache.clear();
      keys.length = 0;
    },
    get size(): number {
      return cache.size;
    },
  };
}

/**
 * Lazy load component with loading state
 */
export function lazyLoad<T extends React.ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>
): React.LazyExoticComponent<T> {
  return React.lazy(importFunc);
}
