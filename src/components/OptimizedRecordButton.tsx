/**
 * Optimized Record Button Component
 *
 * Performance optimizations:
 * - React.memo() to prevent unnecessary re-renders
 * - useCallback() for event handlers
 * - useMemo() for expensive computations
 * - CSS transforms instead of animations where possible
 */

import React, { memo, useCallback, useMemo } from 'react';

interface OptimizedRecordButtonProps {
  isRecording: boolean;
  isProcessing: boolean;
  duration: number;
  onStart: () => void;
  onStop: () => void;
}

// Memoized component to prevent re-renders when props haven't changed
export const OptimizedRecordButton = memo<OptimizedRecordButtonProps>(
  function OptimizedRecordButton({ isRecording, isProcessing, duration, onStart, onStop }) {
    // Memoize event handlers to prevent recreating functions on every render
    const handleMouseDown = useCallback(() => {
      if (!isProcessing) {
        onStart();
      }
    }, [isProcessing, onStart]);

    const handleMouseUp = useCallback(() => {
      if (isRecording) {
        onStop();
      }
    }, [isRecording, onStop]);

    // Memoize expensive computation (duration formatting)
    const formattedDuration = useMemo(() => {
      const mins = Math.floor(duration / 60);
      const secs = duration % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }, [duration]);

    // Memoize button style classes
    const buttonClassName = useMemo(() => {
      const baseClasses =
        'w-24 h-24 rounded-full flex items-center justify-center transition-all duration-200 select-none min-w-[44px] min-h-[44px] touch-manipulation';

      const stateClasses = isRecording
        ? 'bg-red-500 scale-110 shadow-lg shadow-red-500/50 animate-pulse'
        : isProcessing
          ? 'bg-slate-600 cursor-not-allowed'
          : 'bg-blue-500 hover:bg-blue-400 hover:scale-105 active:scale-95';

      return `${baseClasses} ${stateClasses}`;
    }, [isRecording, isProcessing]);

    const ariaLabel = useMemo(() => {
      if (isRecording) return 'Release to stop recording';
      if (isProcessing) return 'Processing...';
      return 'Hold to record';
    }, [isRecording, isProcessing]);

    return (
      <div className="flex flex-col items-center">
        <button
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onTouchStart={handleMouseDown}
          onTouchEnd={handleMouseUp}
          disabled={isProcessing}
          aria-label={ariaLabel}
          className={buttonClassName}
        >
          {isProcessing ? (
            <LoadingSpinner size="lg" />
          ) : (
            <MicrophoneIcon />
          )}
        </button>
        {isRecording && duration > 0 && (
          <div className="mt-3 px-3 py-1 bg-slate-800 rounded-full fade-in">
            <span className="text-sm font-mono text-red-400" aria-live="polite">
              {formattedDuration}
            </span>
          </div>
        )}
      </div>
    );
  },
  // Custom comparison function for fine-grained control
  (prevProps, nextProps) => {
    return (
      prevProps.isRecording === nextProps.isRecording &&
      prevProps.isProcessing === nextProps.isProcessing &&
      prevProps.duration === nextProps.duration
    );
  }
);

OptimizedRecordButton.displayName = 'OptimizedRecordButton';

// Memoized child components
const LoadingSpinner = memo(({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) => {
  const sizeClasses = useMemo(() => ({
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  }), []);

  return (
    <svg className={`animate-spin ${sizeClasses[size]}`} viewBox="0 0 24 24">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
        fill="none"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
});

LoadingSpinner.displayName = 'LoadingSpinner';

const MicrophoneIcon = memo(() => (
  <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
    <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
  </svg>
));

MicrophoneIcon.displayName = 'MicrophoneIcon';

export default OptimizedRecordButton;
