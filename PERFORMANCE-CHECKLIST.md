# Performance Optimization Checklist

A quick reference for maintaining optimal performance in Makerlog.ai.

## Pre-Deployment Checklist

### Bundle Size
- [ ] Run `npm run build` and check bundle size
- [ ] Ensure main bundle < 150KB gzipped
- [ ] Verify code splitting is working (check network tab)
- [ ] Remove unused dependencies
- [ ] Run `npm run build:analyze` if available

### Core Web Vitals
- [ ] Lighthouse score > 90 for Performance
- [ ] First Contentful Paint < 1.8s
- [ ] Largest Contentful Paint < 2.5s
- [ ] First Input Delay < 100ms
- [ ] Cumulative Layout Shift < 0.1

### Code Quality
- [ ] No console.log() in production (removed by terser)
- [ ] All components use React.memo() where appropriate
- [ ] Event handlers wrapped in useCallback()
- [ ] Expensive computations wrapped in useMemo()
- [ ] No memory leaks (cleanup in useEffect)

### Assets & Resources
- [ ] Images in WebP format
- [ ] All images have loading="lazy" (below fold)
- [ ] Font-display: swap for custom fonts
- [ ] Preconnect to API domain
- [ ] Service worker caching enabled

### Testing
- [ ] Test on slow 3G connection
- [ ] Test on mobile devices
- [ ] Test with CPU throttling (4x slowdown)
- [ ] Check for layout shifts
- [ ] Verify no janky animations (> 16ms frame time)

## Component Optimization Checklist

### When Creating New Components
- [ ] Use React.memo() for components that re-render often
- [ ] Wrap event handlers in useCallback()
- [ ] Wrap expensive calculations in useMemo()
- [ ] Avoid inline object/array creation in render
- [ ] Use key prop correctly for lists
- [ ] Implement proper cleanup in useEffect

### Example: Optimized Component Pattern
```typescript
import { memo, useCallback, useMemo } from 'react';

export const MyComponent = memo<MyComponentProps>(
  function MyComponent({ items, onSelect }) {
    // Memoize expensive computations
    const sortedItems = useMemo(
      () => items.sort((a, b) => a.id - b.id),
      [items]
    );

    // Memoize event handlers
    const handleClick = useCallback(
      (id: number) => () => onSelect(id),
      [onSelect]
    );

    return (
      <ul>
        {sortedItems.map(item => (
          <li key={item.id} onClick={handleClick(item.id)}>
            {item.name}
          </li>
        ))}
      </ul>
    );
  },
  // Optional: Custom comparison
  (prevProps, nextProps) => {
    return prevProps.items === nextProps.items;
  }
);
```

## Performance Anti-Patterns to Avoid

### ❌ Don't Do This
```typescript
// Creating new objects in render
function BadComponent({ items }) {
  return (
    <div style={{ color: 'red' }}> // New object every render
      {items.map(item => (
        <div key={item.id} onClick={() => handleClick(item.id)}> // New function every render
          {item.name}
        </div>
      ))}
    </div>
  );
}
```

### ✅ Do This Instead
```typescript
function GoodComponent({ items }) {
  const style = useMemo(() => ({ color: 'red' }), []);

  const handleClick = useCallback(
    (id: number) => () => {
      // Handle click
    },
    []
  );

  return (
    <div style={style}>
      {items.map(item => (
        <div key={item.id} onClick={handleClick(item.id)}>
          {item.name}
        </div>
      ))}
    </div>
  );
}
```

## Quick Performance Wins

### 1. Lazy Load Routes (Implemented ✅)
```typescript
const VoiceChat = lazy(() => import('./VoiceChat'));
const Dashboard = lazy(() => import('./Dashboard'));
```

### 2. Optimize Images
```typescript
<img
  src={image.src}
  alt={image.alt}
  loading="lazy" // Add this
  width={image.width}
  height={image.height} // Add this to prevent layout shift
/>
```

### 3. Debounce Search Input
```typescript
import { debounce } from './utils/performance';

const handleSearch = useCallback(
  debounce((query: string) => {
    // Perform search
  }, 300),
  []
);
```

### 4. Virtualize Long Lists
```typescript
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={400}
  itemCount={items.length}
  itemSize={50}
  width="100%"
>
  {({ index, style }) => (
    <div style={style}>
      {items[index].name}
    </div>
  )}
</FixedSizeList>
```

## Monitoring in Production

### Key Metrics to Track
1. **Page Load Time**: Target < 3s
2. **First Contentful Paint**: Target < 1.8s
3. **Time to Interactive**: Target < 3.5s
4. **Bundle Size**: Target < 150KB gzipped
5. **Error Rate**: Target < 0.1%

### Tools to Use
- **Lighthouse CI**: Automated performance auditing
- **Cloudflare Web Analytics**: Real-user monitoring
- **Sentry**: Error tracking and performance
- **Custom Analytics**: Use `usePerformanceMonitor` hook

## Troubleshooting Guide

### Symptom: Slow Initial Load
**Possible Causes:**
- Large bundle size
- Too many synchronous imports
- Unoptimized images
- Missing code splitting

**Solutions:**
- Run bundle analyzer
- Implement route-based splitting
- Optimize images (WebP, lazy loading)
- Add resource hints (preconnect, preload)

### Symptom: Janky Animations
**Possible Causes:**
- Expensive renders during animation
- Layout thrashing
- Unoptimized CSS

**Solutions:**
- Use CSS transforms instead of position changes
- Implement `will-change` sparingly
- Offload to GPU (transform: translateZ(0))
- Use requestAnimationFrame for JS animations

### Symptom: High Memory Usage
**Possible Causes:**
- Memory leaks (event listeners, intervals)
- Large object allocations
- Uncached API responses

**Solutions:**
- Implement cleanup in useEffect
- Use weak references
- Implement pagination for large lists
- Cache API responses with size limits

### Symptom: Layout Shifts
**Possible Causes:**
- Images without dimensions
- Dynamic content insertion
- Async content loading

**Solutions:**
- Add width/height to images
- Reserve space for async content
- Use skeleton screens
- Implement font-display: swap

## Regular Maintenance

### Weekly
- [ ] Check bundle size trends
- [ ] Review slow components (React DevTools Profiler)
- [ ] Monitor Core Web Vitals in analytics

### Monthly
- [ ] Update dependencies (check for performance improvements)
- [ ] Audit for unused code
- [ ] Review and optimize slowest components
- [ ] Check for memory leaks

### Quarterly
- [ ] Full performance audit
- [ ] Competitor benchmarking
- [ ] User experience survey
- [ ] Architecture review

## Resources

### Internal
- [PERFORMANCE-OPTIMIZATION.md](./PERFORMANCE-OPTIMIZATION.md) - Comprehensive guide
- [src/utils/performance.ts](./src/utils/performance.ts) - Performance utilities
- [src/hooks/usePerformanceMonitor.ts](./src/hooks/usePerformanceMonitor.ts) - Monitoring hooks

### External
- [web.dev/performance](https://web.dev/performance/) - Google's performance guides
- [vitejs.dev/guide/performance](https://vitejs.dev/guide/performance.html) - Vite optimization
- [react.dev/reference/react/memo](https://react.dev/reference/react/memo) - React optimization

---

**Last Updated**: 2026-01-23
**Version**: 1.0.0
