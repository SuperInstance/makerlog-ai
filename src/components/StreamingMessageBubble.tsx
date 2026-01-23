/**
 * StreamingMessageBubble Component
 *
 * Displays a message with real-time streaming support.
 * Features:
 * - Typewriter effect for streaming content
 * - Blinking cursor during active streaming
 * - Smooth fade-in for new tokens
 * - Auto-scroll to bottom
 */

import React, { useState, useEffect, useRef } from 'react';

interface StreamingMessageBubbleProps {
  content: string;
  isStreaming?: boolean;
  timestamp: number;
  role: 'user' | 'assistant';
  audioUrl?: string;
  onStreamingComplete?: () => void;
}

export function StreamingMessageBubble({
  content,
  isStreaming = false,
  timestamp,
  role,
  audioUrl,
  onStreamingComplete,
}: StreamingMessageBubbleProps) {
  const [displayedContent, setDisplayedContent] = useState(content);
  const [showCursor, setShowCursor] = useState(isStreaming);
  const previousContentRef = useRef(content);
  const bubbleRef = useRef<HTMLDivElement>(null);

  // Update displayed content with typewriter effect
  useEffect(() => {
    if (content !== previousContentRef.current) {
      const diffLength = content.length - previousContentRef.current.length;

      if (diffLength > 0) {
        // New content added - animate the difference
        setDisplayedContent(content);

        // Auto-scroll to bottom
        if (bubbleRef.current) {
          bubbleRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
      } else {
        // Content replaced - show immediately
        setDisplayedContent(content);
      }

      previousContentRef.current = content;
    }

    // Manage cursor visibility
    if (isStreaming) {
      setShowCursor(true);
    } else {
      // Delay cursor removal for smooth transition
      const timer = setTimeout(() => {
        setShowCursor(false);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [content, isStreaming]);

  // Handle streaming complete
  useEffect(() => {
    if (!isStreaming && onStreamingComplete) {
      onStreamingComplete();
    }
  }, [isStreaming, onStreamingComplete]);

  const isUser = role === 'user';
  const timeString = new Date(timestamp * 1000).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      ref={bubbleRef}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 fade-in`}
    >
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-lg ${
          isUser
            ? 'bg-blue-500 text-white rounded-br-md'
            : 'bg-slate-700 text-white rounded-bl-md'
        }`}
      >
        <div className="text-sm leading-relaxed break-words">
          {displayedContent}
          {showCursor && <span className="streaming-cursor" aria-hidden="true" />}
        </div>

        <div className="flex items-center justify-between mt-2">
          <span className="text-xs opacity-60">{timeString}</span>

          {audioUrl && (
            <button
              onClick={() => {
                const audio = new Audio(audioUrl);
                audio.play();
              }}
              className="text-xs opacity-60 hover:opacity-100 ml-2 flex items-center gap-1 btn-press focus-ring rounded px-1"
              aria-label={isUser ? 'Play your recording' : 'Play response audio'}
            >
              🔊
            </button>
          )}

          {isStreaming && (
            <span
              className="ml-2 flex items-center gap-1 text-xs opacity-60"
              aria-live="polite"
            >
              <span className="streaming-indicator w-2 h-2 rounded-full bg-green-400" />
              <span className="hidden sm:inline">Streaming...</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default StreamingMessageBubble;
