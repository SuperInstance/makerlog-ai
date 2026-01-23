/**
 * usePerformanceMonitor Hook
 *
 * Monitors and tracks Web Vitals and custom performance metrics.
 * Reports metrics to analytics in production.
 */

import { useEffect, useRef } from 'react';
import {
  trackWebVitals,
  reportMetrics,
  PerformanceMetrics,
  measurePerformance,
  getNavigationTiming,
} from '../utils/performance';

export interface UsePerformanceMonitorOptions {
  /**
   * Enable/disable monitoring
   * @default true in development, false in production (use analytics service instead)
   */
  enabled?: boolean;

  /**
   * Callback to handle metrics
   */
  onMetric?: (
    name: string,
    value: number,
    rating: 'good' | 'needs-improvement' | 'poor'
  ) => void;

  /**
   * Report to analytics service
   */
  reportToAnalytics?: boolean;
}

export function usePerformanceMonitor({
  enabled = import.meta.env.DEV,
  onMetric,
  reportToAnalytics = import.meta.env.PROD,
}: UsePerformanceMonitorOptions = {}) {
  const metricsRef = useRef<PerformanceMetrics>({});
  const hasReportedRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    // Track initial page load
    const markName = 'app-start';
    measurePerformance(markName, 'app-load-time');

    // Track Web Vitals
    const handleMetric = (
      name: string,
      value: number,
      rating: 'good' | 'needs-improvement' | 'poor'
    ) => {
      // Store metric
      (metricsRef.current as any)[name.toLowerCase()] = value;

      // Log in development
      if (import.meta.env.DEV) {
        const emoji = rating === 'good' ? '✅' : rating === 'needs-improvement' ? '⚠️' : '❌';
        console.log(`${emoji} ${name}: ${Math.round(value)}ms (${rating})`);
      }

      // Call custom callback
      onMetric?.(name, value, rating);
    };

    // Start tracking
    trackWebVitals(handleMetric);

    // Get navigation timing after page load
    if (document.readyState === 'complete') {
      const navTiming = getNavigationTiming();
      if (navTiming) {
        metricsRef.current = { ...metricsRef.current, ...navTiming };
      }
    } else {
      window.addEventListener('load', () => {
        const navTiming = getNavigationTiming();
        if (navTiming) {
          metricsRef.current = { ...metricsRef.current, ...navTiming };
        }
      });
    }

    // Report metrics once after page load
    if (reportToAnalytics && !hasReportedRef.current) {
      window.addEventListener('load', () => {
        // Wait a bit to ensure all metrics are collected
        setTimeout(() => {
          reportMetrics(metricsRef.current);
          hasReportedRef.current = true;
        }, 1000);
      });
    }
  }, [enabled, onMetric, reportToAnalytics]);

  return {
    metrics: metricsRef.current,
  };
}

/**
 * Hook to measure component render performance
 */
export function useRenderTime(componentName: string, enabled = import.meta.env.DEV) {
  const renderCountRef = useRef(0);
  const renderTimesRef = useRef<number[]>([]);

  useEffect(() => {
    if (!enabled) return;

    renderCountRef.current++;

    const startTime = performance.now();

    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;

      renderTimesRef.current.push(renderTime);

      // Log slow renders
      if (renderTime > 16) {
        // 16ms = 60fps threshold
        console.warn(
          `🐌 ${componentName} render #${renderCountRef.current} took ${renderTime.toFixed(2)}ms`
        );
      }
    };
  }, [componentName, enabled]);

  return {
    renderCount: renderCountRef.current,
    averageRenderTime:
      renderTimesRef.current.length > 0
        ? renderTimesRef.current.reduce((a, b) => a + b, 0) / renderTimesRef.current.length
        : 0,
    lastRenderTime: renderTimesRef.current[renderTimesRef.current.length - 1] || 0,
  };
}

/**
 * Hook to measure async operation performance
 */
export function useAsyncMeasure() {
  const measureStart = useRef<number>(0);

  const start = (name: string) => {
    measureStart.current = performance.now();
    if (import.meta.env.DEV) {
      console.log(`⏱️ Starting: ${name}`);
    }
  };

  const end = (name: string) => {
    const duration = performance.now() - measureStart.current;
    if (import.meta.env.DEV) {
      console.log(`✅ Completed: ${name} (${duration.toFixed(2)}ms)`);
    }
    return duration;
  };

  const measure = async <T,>(
    name: string,
    fn: () => Promise<T>
  ): Promise<T> => {
    start(name);
    try {
      const result = await fn();
      end(name);
      return result;
    } catch (error) {
      console.error(`❌ Error in ${name}:`, error);
      throw error;
    }
  };

  return { start, end, measure };
}

/**
 * Hook to detect and report layout shifts
 */
export function useLayoutShiftDetection(enabled = import.meta.env.DEV) {
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    let clsValue = 0;

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const clsEntry = entry as any;
        if (!clsEntry.hadRecentInput) {
          clsValue += clsEntry.value;

          if (clsEntry.sources && clsEntry.sources.length > 0) {
            console.warn(
              `📐 Layout shift detected: ${clsEntry.value.toFixed(4)}`,
              clsEntry.sources.map((s: any) => ({
                node: s.node?.nodeName,
                previousRect: s.previousRect,
                currentRect: s.currentRect,
              }))
            );
          }
        }
      }
    });

    try {
      observer.observe({ entryTypes: ['layout-shift'] });
    } catch (error) {
      console.warn('Failed to observe layout shifts:', error);
    }

    return () => observer.disconnect();
  }, [enabled]);

  return null;
}

/**
 * Hook to monitor memory usage (Chrome only)
 */
export function useMemoryMonitor(enabled = import.meta.env.DEV, interval = 5000) {
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    // Check if performance.memory is available (Chrome-based browsers)
    if (!(performance as any).memory) {
      console.warn('Memory monitoring not available in this browser');
      return;
    }

    const intervalId = setInterval(() => {
      const memory = (performance as any).memory;
      const usedMB = (memory.usedJSHeapSize / 1048576).toFixed(2);
      const totalMB = (memory.totalJSHeapSize / 1048576).toFixed(2);
      const limitMB = (memory.jsHeapSizeLimit / 1048576).toFixed(2);

      const usagePercent = ((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100).toFixed(2);

      if (parseFloat(usagePercent) > 80) {
        console.warn(
          `🚨 High memory usage: ${usedMB}MB / ${limitMB}MB (${usagePercent}%)`
        );
      } else if (import.meta.env.DEV) {
        console.log(
          `💾 Memory: ${usedMB}MB / ${limitMB}MB (${usagePercent}%)`
        );
      }
    }, interval);

    return () => clearInterval(intervalId);
  }, [enabled, interval]);

  return null;
}

export default usePerformanceMonitor;
