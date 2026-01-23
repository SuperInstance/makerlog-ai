/**
 * Makerlog.ai - Voice Chat Interface
 * 
 * Primary interface for "vibe all day" workflow:
 * - Push-to-talk or continuous recording
 * - Real-time transcription display
 * - TTS for assistant responses
 * - Visual feedback for recording state
 * - Conversation history sidebar
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNotifications } from './hooks/useNotifications';
import { API_BASE } from './config/api';

// Types
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  audioUrl?: string;
  timestamp: number;
}

interface RecordingState {
  isRecording: boolean;
  startedAt: number | null;
  duration: number; // in seconds
}

interface Conversation {
  id: string;
  title: string;
  updatedAt: number;
  messageCount: number;
}

interface Opportunity {
  id: string;
  type: 'image' | 'code' | 'text' | 'audio';
  prompt: string;
  confidence: number;
  status: string;
}

// API_BASE is now imported from config/api.ts

// ============ HOOKS ============

/**
 * Progressive recording hook that uploads chunks during recording.
 * This prevents data loss if the app crashes or loses connection.
 */
function useProgressiveRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recordingState, setRecordingState] = useState<RecordingState>({
    isRecording: false,
    startedAt: null,
    duration: 0,
  });
  const [transcript, setTranscript] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const durationIntervalRef = useRef<number | null>(null);
  const uploadIntervalRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const recordingIdRef = useRef<string | null>(null);
  const chunkIndexRef = useRef(0);

  // Play beep tone for audio feedback
  const playBeep = useCallback((frequency: number, duration: number) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioContextRef.current;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration / 1000);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration / 1000);
  }, []);

  // Trigger haptic feedback
  const triggerHaptic = useCallback((pattern: number | number[]) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  }, []);

  // Upload a chunk to R2
  const uploadChunk = useCallback(async (blob: Blob, isFinal: boolean = false) => {
    const recordingId = recordingIdRef.current;
    if (!recordingId) return;

    const chunkIndex = chunkIndexRef.current++;
    const formData = new FormData();
    formData.append('audio', blob, `chunk-${chunkIndex}.webm`);
    formData.append('recording_id', recordingId);
    formData.append('chunk_index', chunkIndex.toString());
    formData.append('is_final', isFinal.toString());

    try {
      const response = await fetch(`${API_BASE}/voice/upload-chunk`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        console.error('Chunk upload failed:', await response.text());
      }
    } catch (err) {
      console.error('Chunk upload error:', err);
    }
  }, []);

  // Finalize recording (transcribe and get AI response)
  const finalizeRecording = useCallback(async (recordingId: string, conversationId: string | null) => {
    setIsProcessing(true);
    try {
      const response = await fetch(`${API_BASE}/voice/finalize-recording`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recording_id: recordingId,
          conversation_id: conversationId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to finalize recording');
      }

      const data = await response.json();
      setTranscript(data.transcript);
      return data;
    } catch (err) {
      setError('Failed to process recording');
      console.error('Finalize error:', err);
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [API_BASE]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      // Generate unique recording ID
      recordingIdRef.current = crypto.randomUUID();
      chunkIndexRef.current = 0;
      chunksRef.current = [];

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Upload remaining chunks as final
        if (chunksRef.current.length > 0) {
          const finalBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
          await uploadChunk(finalBlob, true);
        }
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(1000); // Collect data every 1 second

      const startedAt = Date.now();
      setIsRecording(true);
      setRecordingState({
        isRecording: true,
        startedAt,
        duration: 0,
      });
      setError(null);
      setTranscript(null);

      // Play start beep (higher frequency)
      playBeep(800, 100);
      // Haptic feedback for start
      triggerHaptic(10);

      // Request wake lock to prevent screen sleep
      if ('wakeLock' in navigator) {
        try {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        } catch (err) {
          console.warn('Wake lock request failed:', err);
        }
      }

      // Start duration tracking
      durationIntervalRef.current = setInterval(() => {
        setRecordingState((prev) => ({
          ...prev,
          duration: Math.floor((Date.now() - startedAt) / 1000),
        }));
      }, 100);

      // Start chunk upload interval (every 10 seconds)
      uploadIntervalRef.current = setInterval(() => {
        if (chunksRef.current.length > 0) {
          // Combine recent chunks and upload
          const recentChunks = chunksRef.current.splice(-10); // Take last 10 chunks
          const chunkBlob = new Blob(recentChunks, { type: 'audio/webm' });
          uploadChunk(chunkBlob, false);
        }
      }, 10000);

    } catch (err) {
      setError('Microphone access denied');
      console.error('Failed to start recording:', err);
    }
  }, [playBeep, triggerHaptic, uploadChunk]);

  const stopRecording = useCallback(async (conversationId?: string) => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setRecordingState({
        isRecording: false,
        startedAt: null,
        duration: 0,
      });

      // Clear intervals
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
      if (uploadIntervalRef.current) {
        clearInterval(uploadIntervalRef.current);
        uploadIntervalRef.current = null;
      }

      // Release wake lock
      if (wakeLockRef.current) {
        wakeLockRef.current.release();
        wakeLockRef.current = null;
      }

      // Play stop beep (lower frequency)
      playBeep(600, 100);
      // Haptic feedback for stop
      triggerHaptic([20, 50, 20]);

      // Finalize recording
      if (recordingIdRef.current) {
        const result = await finalizeRecording(recordingIdRef.current, conversationId || null);
        return result;
      }
    }
    return null;
  }, [isRecording, playBeep, triggerHaptic, finalizeRecording]);

  return {
    isRecording,
    isProcessing,
    error,
    transcript,
    recordingState,
    startRecording,
    stopRecording,
    setTranscript,
  };
}

function useSpeechSynthesis() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const speak = useCallback((text: string) => {
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.1; // Slightly faster
      utterance.pitch = 1.0;
      
      // Try to find a natural-sounding voice
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(
        (v) => v.name.includes('Samantha') || v.name.includes('Google') || v.lang.startsWith('en')
      );
      if (preferredVoice) utterance.voice = preferredVoice;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  return { isSpeaking, speak, stop };
}

// ============ COMPONENTS ============

// Skeleton loader for messages
function MessageSkeleton() {
  return (
    <div className="flex mb-4 fade-in">
      <div className="max-w-[80%] w-64">
        <div className="bg-slate-800 rounded-2xl px-4 py-3">
          <div className="skeleton h-4 w-48 mb-2 rounded" />
          <div className="skeleton h-4 w-32 rounded" />
        </div>
        <div className="skeleton h-3 w-16 mt-2 rounded" />
      </div>
    </div>
  );
}

// Loading spinner component
function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <svg className={`animate-spin ${sizeClasses[size]}`} viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

// Empty state component
function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: string;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8 fade-in">
      <span className="text-6xl mb-4">{icon}</span>
      <h2 className="text-xl font-medium text-white mb-2">{title}</h2>
      <p className="text-slate-500 max-w-md mb-6">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="px-6 py-2 bg-blue-500 hover:bg-blue-400 text-white rounded-lg btn-press focus-ring"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

// Error alert component
function ErrorAlert({
  message,
  onRetry,
  onDismiss,
}: {
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}) {
  return (
    <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 mb-4 fade-in">
      <div className="flex items-start gap-3">
        <span className="text-xl flex-shrink-0">⚠️</span>
        <div className="flex-1">
          <p className="text-red-400 font-medium">Something went wrong</p>
          <p className="text-red-300/80 text-sm mt-1">{message}</p>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-red-400 hover:text-red-300 transition-colors"
            aria-label="Dismiss error"
          >
            ✕
          </button>
        )}
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-3 text-sm text-red-400 hover:text-red-300 underline"
        >
          Try again
        </button>
      )}
    </div>
  );
}

function RecordButton({
  isRecording,
  isProcessing,
  duration,
  onStart,
  onStop,
}: {
  isRecording: boolean;
  isProcessing: boolean;
  duration: number;
  onStart: () => void;
  onStop: () => void;
}) {
  const handleMouseDown = () => {
    if (!isProcessing) onStart();
  };

  const handleMouseUp = () => {
    if (isRecording) onStop();
  };

  // Format duration as MM:SS
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-center">
      <button
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onTouchStart={handleMouseDown}
        onTouchEnd={handleMouseUp}
        disabled={isProcessing}
        aria-label={isRecording ? 'Release to stop recording' : isProcessing ? 'Processing...' : 'Hold to record'}
        className={`
          w-24 h-24 rounded-full flex items-center justify-center
          transition-all duration-200 select-none
          min-w-[44px] min-h-[44px] touch-manipulation
          ${isRecording
            ? 'bg-red-500 scale-110 shadow-lg shadow-red-500/50 animate-pulse'
            : isProcessing
              ? 'bg-slate-600 cursor-not-allowed'
              : 'bg-blue-500 hover:bg-blue-400 hover:scale-105 active:scale-95'
          }
        `}
      >
        {isProcessing ? (
          <LoadingSpinner size="lg" />
        ) : (
          <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
            <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
          </svg>
        )}
      </button>
      {isRecording && duration > 0 && (
        <div className="mt-3 px-3 py-1 bg-slate-800 rounded-full fade-in">
          <span className="text-sm font-mono text-red-400" aria-live="polite">
            {formatDuration(duration)}
          </span>
        </div>
      )}
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const [isPlaying, setIsPlaying] = React.useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handlePlayAudio = () => {
    if (message.audioUrl) {
      if (audioRef.current) {
        if (isPlaying) {
          audioRef.current.pause();
        } else {
          audioRef.current.play();
        }
      } else {
        const audio = new Audio(message.audioUrl);
        audioRef.current = audio;
        audio.onended = () => setIsPlaying(false);
        audio.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  React.useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 fade-in`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-lg ${
          isUser
            ? 'bg-blue-500 text-white rounded-br-md'
            : 'bg-slate-700 text-white rounded-bl-md'
        }`}
      >
        <p className="text-sm leading-relaxed break-words">{message.content}</p>
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs opacity-60">
            {new Date(message.timestamp * 1000).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
          {message.audioUrl && (
            <button
              onClick={handlePlayAudio}
              className="text-xs opacity-60 hover:opacity-100 ml-2 flex items-center gap-1 btn-press focus-ring rounded px-1"
              aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
            >
              {isPlaying ? '⏸️' : '🔊'}
              {isPlaying && <span className="text-xs">Playing...</span>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ConversationSidebar({
  conversations,
  currentId,
  onSelect,
  onNew,
}: {
  conversations: Conversation[];
  currentId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
}) {
  return (
    <div className="w-64 bg-slate-900 border-r border-slate-700 flex flex-col">
      <div className="p-4 border-b border-slate-700">
        <button
          onClick={onNew}
          className="w-full py-2 px-4 bg-blue-500 hover:bg-blue-400 rounded-lg text-white font-medium transition btn-press focus-ring min-h-[44px]"
        >
          + New Conversation
        </button>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {conversations.map((conv) => (
          <button
            key={conv.id}
            onClick={() => onSelect(conv.id)}
            className={`w-full text-left p-4 border-b border-slate-800 transition min-h-[56px] focus-ring rounded-none ${
              conv.id === currentId
                ? 'bg-slate-800 border-l-2 border-l-blue-500'
                : 'hover:bg-slate-800/50'
            }`}
          >
            <p className="text-sm text-white font-medium truncate">
              {conv.title || 'Untitled'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {conv.messageCount} message{conv.messageCount !== 1 ? 's' : ''}
            </p>
          </button>
        ))}
        {conversations.length === 0 && (
          <div className="p-6 text-center fade-in">
            <span className="text-3xl mb-2 block">💬</span>
            <p className="text-slate-500 text-sm">No conversations yet</p>
            <p className="text-slate-600 text-xs mt-1">
              Start recording to create one
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function OpportunityCard({
  opportunity,
  onQueue,
  onReject,
  onRefine,
}: {
  opportunity: Opportunity;
  onQueue: () => void;
  onReject: () => void;
  onRefine: (prompt: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedPrompt, setEditedPrompt] = useState(opportunity.prompt);

  const typeIcons = {
    image: '🎨',
    code: '💻',
    text: '📝',
    audio: '🎵',
  };

  return (
    <div className="bg-slate-800 rounded-lg p-4 mb-3 slide-in-right shadow-lg">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">{typeIcons[opportunity.type]}</span>
          <span className="text-sm font-medium text-white capitalize">
            {opportunity.type} Generation
          </span>
        </div>
        <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full font-medium">
          {Math.round(opportunity.confidence * 100)}% match
        </span>
      </div>

      {isEditing ? (
        <div className="mb-3 scale-in">
          <label htmlFor="prompt-edit" className="sr-only">Edit prompt</label>
          <textarea
            id="prompt-edit"
            value={editedPrompt}
            onChange={(e) => setEditedPrompt(e.target.value)}
            className="w-full bg-slate-700 text-white text-sm rounded-lg p-3 border border-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 outline-none resize-none min-h-[80px]"
            rows={3}
            autoFocus
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => {
                onRefine(editedPrompt);
                setIsEditing(false);
              }}
              className="flex-1 text-xs bg-blue-500 hover:bg-blue-400 text-white py-2 px-3 rounded transition btn-press focus-ring min-h-[44px]"
            >
              Save
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="flex-1 text-xs bg-slate-700 hover:bg-slate-600 text-white py-2 px-3 rounded transition btn-press focus-ring min-h-[44px]"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-slate-300 mb-3 line-clamp-2">
          {opportunity.prompt}
        </p>
      )}

      <div className="flex gap-2">
        <button
          onClick={onQueue}
          className="flex-1 text-xs bg-green-500 hover:bg-green-400 text-white py-2 px-3 rounded transition btn-press focus-ring min-h-[44px] font-medium"
        >
          Queue for Tonight
        </button>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="flex-1 text-xs bg-slate-700 hover:bg-slate-600 text-white py-2 px-3 rounded transition btn-press focus-ring min-h-[44px]"
        >
          Refine
        </button>
        <button
          onClick={onReject}
          className="text-xs text-slate-500 hover:text-slate-400 py-2 px-3 transition btn-press focus-ring min-h-[44px] rounded"
          aria-label="Skip opportunity"
        >
          Skip
        </button>
      </div>
    </div>
  );
}

function DailyDigestPanel({
  opportunities,
  onQueueOpportunity,
  onRejectOpportunity,
  onRefineOpportunity,
}: {
  opportunities: Opportunity[];
  onQueueOpportunity: (id: string) => void;
  onRejectOpportunity: (id: string) => void;
  onRefineOpportunity: (id: string, prompt: string) => void;
}) {
  if (opportunities.length === 0) {
    return (
      <div className="p-4 text-center">
        <p className="text-slate-500 text-sm">
          Keep talking! I'll detect generative opportunities from your conversations.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h3 className="text-sm font-medium text-slate-400 mb-3">
        Detected Opportunities ({opportunities.length})
      </h3>
      {opportunities.map((opp) => (
        <OpportunityCard
          key={opp.id}
          opportunity={opp}
          onQueue={() => onQueueOpportunity(opp.id)}
          onReject={() => onRejectOpportunity(opp.id)}
          onRefine={(prompt) => onRefineOpportunity(opp.id, prompt)}
        />
      ))}
    </div>
  );
}

function DailyLogPanel({
  selectedDate,
  onDateChange,
  onEditMessage,
}: {
  selectedDate: string;
  onDateChange: (date: string) => void;
  onEditMessage: (messageId: string, content: string) => void;
}) {
  const [log, setLog] = useState<{ markdown: string; messages: Message[] } | null>(null);
  const [dates, setDates] = useState<{ date: string; messageCount: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingMessage, setEditingMessage] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const fetchLog = async (date: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/daily-log?date=${date}&format=markdown`);
      const data = await res.json();
      setLog(data);
    } catch (e) {
      console.error('Failed to fetch daily log:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchDates = async () => {
    try {
      const res = await fetch('/api/daily-log/dates');
      const data = await res.json();
      setDates(data.dates || []);
    } catch (e) {
      console.error('Failed to fetch dates:', e);
    }
  };

  useEffect(() => {
    fetchLog(selectedDate);
    fetchDates();
  }, [selectedDate]);

  const handleEdit = (messageId: string, content: string) => {
    setEditingMessage(messageId);
    setEditContent(content);
  };

  const handleSave = async () => {
    if (editingMessage) {
      await onEditMessage(editingMessage, editContent);
      setEditingMessage(null);
      setEditContent('');
      // Refresh log
      fetchLog(selectedDate);
    }
  };

  const handleCancel = () => {
    setEditingMessage(null);
    setEditContent('');
  };

  return (
    <div className="h-full flex flex-col bg-slate-900">
      {/* Header with date selector */}
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-white">Daily Log</h2>
          <button
            onClick={() => window.open('/api/daily-log?date=' + selectedDate + '&format=markdown', '_blank')}
            className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-3 py-1 rounded transition"
          >
            Export MD
          </button>
        </div>
        <select
          value={selectedDate}
          onChange={(e) => onDateChange(e.target.value)}
          className="w-full bg-slate-800 text-white border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
        >
          {dates.map((d) => (
            <option key={d.date} value={d.date}>
              {d.date} ({d.messageCount} messages)
            </option>
          ))}
        </select>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="text-center text-slate-500">Loading...</div>
        ) : log ? (
          <div className="prose prose-invert prose-sm max-w-none">
            {/* Editable messages */}
            {log.messages.map((msg) => (
              <div key={msg.id} className="mb-4 group">
                {editingMessage === msg.id ? (
                  <div className="bg-slate-800 p-3 rounded-lg">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full bg-slate-700 text-white text-sm rounded p-2 min-h-[100px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={handleSave}
                        className="text-xs bg-blue-500 hover:bg-blue-400 text-white px-3 py-1 rounded"
                      >
                        Save
                      </button>
                      <button
                        onClick={handleCancel}
                        className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-3 py-1 rounded"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-800 p-3 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-xs font-medium ${
                        msg.role === 'user' ? 'text-blue-400' : 'text-green-400'
                      }`}>
                        {msg.role === 'user' ? 'You' : 'Makerlog'}
                      </span>
                      <button
                        onClick={() => handleEdit(msg.id, msg.content)}
                        className="text-xs text-slate-500 hover:text-slate-300 opacity-0 group-hover:opacity-100 transition"
                      >
                        Edit
                      </button>
                    </div>
                    <p className="text-sm text-slate-300">{msg.content}</p>
                    {msg.audioUrl && (
                      <a
                        href={msg.audioUrl}
                        className="text-xs text-slate-500 hover:text-slate-300 mt-2 inline-block"
                      >
                        🔊 Audio
                      </a>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-slate-500">
            No recordings for this date
          </div>
        )}
      </div>
    </div>
  );
}

interface SearchResult {
  id: string;
  score: number;
  metadata: {
    user_id: string;
    conversation_id: string;
    content: string;
    timestamp: number;
  };
}

function SearchPanel({
  onResultClick,
}: {
  onResultClick: (conversationId: string, messageId: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  const performSearch = async () => {
    if (!query.trim()) return;

    setSearching(true);
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, limit: 20 }),
      });

      const data = await res.json();
      setResults(data.results || []);
    } catch (e) {
      console.error('Search failed:', e);
    } finally {
      setSearching(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch();
  };

  return (
    <div className="h-full flex flex-col bg-slate-900">
      {/* Search input */}
      <div className="p-4 border-b border-slate-700">
        <h2 className="text-lg font-bold text-white mb-3">Semantic Search</h2>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="What did I say about..."
            className="flex-1 bg-slate-800 text-white border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={searching}
            className="bg-blue-500 hover:bg-blue-400 text-white px-4 py-2 rounded-lg text-sm transition disabled:opacity-50"
          >
            {searching ? '...' : '🔍'}
          </button>
        </form>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto p-4">
        {results.length === 0 && !searching && (
          <div className="text-center text-slate-500 text-sm">
            Search your conversations by meaning, not just keywords.
          </div>
        )}

        {results.map((result) => (
          <div
            key={result.id}
            onClick={() =>
              onResultClick(result.metadata.conversation_id, result.id)
            }
            className="bg-slate-800 rounded-lg p-3 mb-2 cursor-pointer hover:bg-slate-700 transition"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">
                {Math.round(result.score * 100)}% match
              </span>
              <span className="text-xs text-slate-500">
                {new Date(result.metadata.timestamp * 1000).toLocaleDateString()}
              </span>
            </div>
            <p className="text-sm text-slate-300 line-clamp-3">
              {result.metadata.content}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

interface QuotaData {
  images: { used: number; limit: number; remaining: number };
  tokens: { used: number; limit: number; remaining: number };
  resetAt: string;
}

function QuotaDashboard() {
  const [quota, setQuota] = useState<QuotaData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchQuota = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/quota');
      const data = await res.json();
      setQuota(data);
    } catch (e) {
      console.error('Failed to fetch quota:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuota();
    // Refresh every 30 seconds
    const interval = setInterval(fetchQuota, 30000);
    return () => clearInterval(interval);
  }, []);

  // Calculate time until reset
  const getTimeUntilReset = () => {
    if (!quota) return '';
    const resetTime = new Date(quota.resetAt);
    const now = new Date();
    const diff = resetTime.getTime() - now.getTime();

    if (diff <= 0) return 'Resets soon';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  // Calculate overall percentage
  const getOverallPercentage = () => {
    if (!quota) return 0;
    const imagePercent = (quota.images.used / quota.images.limit) * 100;
    const tokenPercent = (quota.tokens.used / quota.tokens.limit) * 100;
    return Math.round((imagePercent + tokenPercent) / 2);
  };

  return (
    <div className="h-full flex flex-col bg-slate-900">
      <div className="p-4 border-b border-slate-700">
        <h2 className="text-lg font-bold text-white mb-3">Quota Dashboard</h2>
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Resets in: {getTimeUntilReset()}</span>
          <button onClick={fetchQuota} className="text-blue-400 hover:text-blue-300">
            Refresh
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="text-center text-slate-500">Loading...</div>
        ) : quota ? (
          <div className="space-y-4">
            {/* Overall Usage */}
            <div className="bg-slate-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-white font-medium">Overall Usage</span>
                <span className="text-2xl font-bold text-blue-400">
                  {getOverallPercentage()}%
                </span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(getOverallPercentage(), 100)}%` }}
                />
              </div>
            </div>

            {/* Image Generation */}
            <div className="bg-slate-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-white">🎨 Image Generation</span>
                <span className="text-sm text-slate-400">
                  {quota.images.used} / {quota.images.limit}
                </span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div
                  className="bg-purple-500 h-2 rounded-full transition-all"
                  style={{
                    width: `${Math.min(
                      (quota.images.used / quota.images.limit) * 100,
                      100
                    )}%`,
                  }}
                />
              </div>
              <p className="text-xs text-slate-500 mt-2">
                {quota.images.remaining} remaining
              </p>
            </div>

            {/* Text Generation */}
            <div className="bg-slate-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-white">📝 Text Generation</span>
                <span className="text-sm text-slate-400">
                  {quota.tokens.used.toLocaleString()} / {quota.tokens.limit.toLocaleString()}
                </span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all"
                  style={{
                    width: `${Math.min(
                      (quota.tokens.used / quota.tokens.limit) * 100,
                      100
                    )}%`,
                  }}
                />
              </div>
              <p className="text-xs text-slate-500 mt-2">
                {quota.tokens.remaining.toLocaleString()} remaining
              </p>
            </div>

            {/* Efficiency */}
            <div className="bg-slate-800 rounded-lg p-4">
              <span className="text-sm text-white block mb-2">⚡ Efficiency</span>
              <p className="text-xs text-slate-400">
                Your quota usage is {getOverallPercentage() > 80 ? 'high' : getOverallPercentage() > 50 ? 'moderate' : 'low'}.
                {getOverallPercentage() > 90 && ' Consider harvesting soon!'}
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center text-slate-500">
            Failed to load quota data
          </div>
        )}
      </div>
    </div>
  );
}

// ============ SCREENSHOT PASTE HOOK ============

function useScreenshotPaste() {
  const [screenshot, setScreenshot] = useState<{ file: File; url: string } | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);

  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            const url = URL.createObjectURL(file);
            setScreenshot({ file, url });
            setAnalysis(null);
          }
          break;
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const analyzeScreenshot = async () => {
    if (!screenshot) return;

    setAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append('image', screenshot.file);
      formData.append('type', 'caption');

      const response = await fetch('/api/analyze/image', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      setAnalysis(data.result || 'Analysis complete');
    } catch (e) {
      console.error('Screenshot analysis failed:', e);
      setAnalysis('Failed to analyze screenshot');
    } finally {
      setAnalyzing(false);
    }
  };

  const clearScreenshot = () => {
    if (screenshot) {
      URL.revokeObjectURL(screenshot.url);
    }
    setScreenshot(null);
    setAnalysis(null);
  };

  return {
    screenshot,
    analyzing,
    analysis,
    analyzeScreenshot,
    clearScreenshot,
  };
}

// ============ GAMIFICATION PANEL ============

interface Achievement {
  id: string;
  user_id: string;
  achievement_type: string;
  xp_awarded: number;
  unlocked_at: number;
}

interface UserData {
  xp: number;
  level: number;
  streak_days: number;
}

interface GamificationData {
  user: UserData;
  unlocked: Achievement[];
  available: Record<string, { name: string; description: string; xp: number; icon: string }>;
}

function GamificationPanel() {
  const [data, setData] = useState<GamificationData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/achievements');
      const result = await res.json();
      setData(result);
    } catch (e) {
      console.error('Failed to fetch achievements:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Calculate progress to next level
  const getLevelProgress = () => {
    if (!data) return { current: 0, target: 100, percentage: 0 };
    const currentLevel = data.user.level;
    const currentXP = data.user.xp;
    // Level formula: level = floor(sqrt(xp / 100)) + 1
    // So: xp = (level - 1)^2 * 100
    const currentLevelXP = Math.pow(currentLevel - 1, 2) * 100;
    const nextLevelXP = Math.pow(currentLevel, 2) * 100;
    const progressInLevel = currentXP - currentLevelXP;
    const requiredForNext = nextLevelXP - currentLevelXP;
    const percentage = Math.min((progressInLevel / requiredForNext) * 100, 100);

    return { current: progressInLevel, target: requiredForNext, percentage };
  };

  const levelProgress = getLevelProgress();

  return (
    <div className="h-full flex flex-col bg-slate-900">
      <div className="p-4 border-b border-slate-700">
        <h2 className="text-lg font-bold text-white mb-3">🏆 Achievements</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="text-center text-slate-500">Loading...</div>
        ) : data ? (
          <div className="space-y-4">
            {/* Level & XP */}
            <div className="bg-gradient-to-br from-blue-900/50 to-purple-900/50 rounded-lg p-4 border border-blue-700/50">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-xs text-slate-400">Level</p>
                  <p className="text-3xl font-bold text-white">{data.user.level}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400">Total XP</p>
                  <p className="text-xl font-bold text-yellow-400">{data.user.xp.toLocaleString()}</p>
                </div>
              </div>
              <div className="mt-3">
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Progress to Level {data.user.level + 1}</span>
                  <span>{Math.round(levelProgress.percentage)}%</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all"
                    style={{ width: `${levelProgress.percentage}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Streak */}
            <div className="bg-slate-800 rounded-lg p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">Current Streak</p>
                <p className="text-2xl font-bold text-orange-400 flex items-center gap-2">
                  🔥 {data.user.streak_days} day{data.user.streak_days !== 1 ? 's' : ''}
                </p>
              </div>
              {data.user.streak_days >= 7 && (
                <span className="text-2xl">🏆</span>
              )}
            </div>

            {/* Unlocked Achievements */}
            <div>
              <h3 className="text-sm font-medium text-slate-400 mb-2">Unlocked ({data.unlocked.length})</h3>
              <div className="space-y-2">
                {data.unlocked.map((achievement) => {
                  const meta = data.available[achievement.achievement_type];
                  if (!meta) return null;
                  return (
                    <div
                      key={achievement.id}
                      className="bg-green-900/20 border border-green-700/50 rounded-lg p-3 flex items-center gap-3"
                    >
                      <span className="text-2xl">{meta.icon}</span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white">{meta.name}</p>
                        <p className="text-xs text-slate-400">{meta.description}</p>
                      </div>
                      <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded">
                        +{meta.xp} XP
                      </span>
                    </div>
                  );
                })}
                {data.unlocked.length === 0 && (
                  <p className="text-xs text-slate-500">No achievements yet. Keep recording!</p>
                )}
              </div>
            </div>

            {/* Available Achievements */}
            <div>
              <h3 className="text-sm font-medium text-slate-400 mb-2">Locked</h3>
              <div className="space-y-2">
                {Object.entries(data.available)
                  .filter(([key]) => !data.unlocked.some((a) => a.achievement_type === key))
                  .map(([key, meta]) => (
                    <div
                      key={key}
                      className="bg-slate-800 rounded-lg p-3 flex items-center gap-3 opacity-60"
                    >
                      <span className="text-2xl grayscale">{meta.icon}</span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-300">{meta.name}</p>
                        <p className="text-xs text-slate-500">{meta.description}</p>
                      </div>
                      <span className="text-xs text-slate-500 px-2 py-1 rounded">
                        +{meta.xp} XP
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center text-slate-500">Failed to load achievements</div>
        )}
      </div>
    </div>
  );
}

// ============ NOTIFICATION PANEL ============

function NotificationPanel() {
  const {
    notifications,
    markAsRead,
    clearAll,
  } = useNotifications();

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {notifications.slice(0, 5).map((notification) => (
        <div
          key={notification.id}
          onClick={() => markAsRead(notification.id)}
          className={`bg-slate-800 border rounded-lg p-4 shadow-lg max-w-sm transition-all cursor-pointer ${
            notification.read
              ? 'border-slate-700 opacity-60'
              : 'border-blue-500 animate-slide-in'
          }`}
        >
          <div className="flex items-start gap-3">
            <span className="text-2xl">{notification.icon}</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-white">{notification.title}</p>
              <p className="text-xs text-slate-400 mt-1">{notification.message}</p>
            </div>
            {!notification.read && (
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            )}
          </div>
        </div>
      ))}

      {notifications.length > 5 && (
        <div className="text-center">
          <button
            onClick={clearAll}
            className="text-xs text-slate-500 hover:text-slate-300"
          >
            Clear all notifications
          </button>
        </div>
      )}
    </div>
  );
}

// ============ MAIN VOICE CHAT COMPONENT ============

export default function VoiceChat() {
  // State
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [showOpportunities, setShowOpportunities] = useState(false);
  const [showDailyLog, setShowDailyLog] = useState(false);
  const [selectedLogDate, setSelectedLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [showSearch, setShowSearch] = useState(false);
  const [showQuota, setShowQuota] = useState(false);
  const [showGamification, setShowGamification] = useState(false);

  // Hooks - Using progressive recorder for chunked uploads
  const { isRecording, isProcessing, error, transcript, recordingState, startRecording, stopRecording, setTranscript } = useProgressiveRecorder();
  const { isSpeaking, speak, stop: stopSpeaking } = useSpeechSynthesis();
  const { screenshot, analyzing, analysis, analyzeScreenshot, clearScreenshot } = useScreenshotPaste();
  const { requestPermission } = useNotifications();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load conversations on mount
  useEffect(() => {
    fetchConversations();
    fetchOpportunities();
  }, []);

  // Load messages when conversation changes
  useEffect(() => {
    if (currentConversationId) {
      fetchMessages(currentConversationId);
    }
  }, [currentConversationId]);

  // Process transcript when ready
  useEffect(() => {
    if (transcript) {
      // Add user message
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'user',
          content: transcript,
          timestamp: Math.floor(Date.now() / 1000),
        },
      ]);

      // Set transcript to null to avoid re-processing
      setTranscript(null);
    }
  }, [transcript]);

  // API calls
  const fetchConversations = async () => {
    try {
      const res = await fetch(`${API_BASE}/conversations`);
      const data = await res.json();
      setConversations(data.conversations || []);
    } catch (e) {
      console.error('Failed to fetch conversations:', e);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    try {
      const res = await fetch(`${API_BASE}/conversations/${conversationId}`);
      const data = await res.json();
      setMessages(data.messages || []);
    } catch (e) {
      console.error('Failed to fetch messages:', e);
    }
  };

  const fetchOpportunities = async () => {
    try {
      const res = await fetch(`${API_BASE}/opportunities`);
      const data = await res.json();
      setOpportunities(data.opportunities || []);
    } catch (e) {
      console.error('Failed to fetch opportunities:', e);
    }
  };

  const handleRecordingStart = useCallback(() => {
    startRecording();
  }, [startRecording]);

  const handleRecordingStop = useCallback(async () => {
    const result = await stopRecording();

    if (result) {
      // Update conversation ID if new
      if (!currentConversationId && result.conversationId) {
        setCurrentConversationId(result.conversationId);
        fetchConversations();
      }

      // Add user message
      setMessages((prev) => [
        ...prev,
        {
          id: result.messageId,
          role: 'user',
          content: result.transcript,
          audioUrl: result.audioUrl,
          timestamp: Math.floor(Date.now() / 1000),
        },
      ]);

      // Add assistant message
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: result.response,
          timestamp: Math.floor(Date.now() / 1000),
        },
      ]);

      // Speak the response
      speak(result.response);

      // Refresh opportunities
      fetchOpportunities();
    }
  }, [stopRecording, currentConversationId, speak]);

  const createNewConversation = async () => {
    try {
      const res = await fetch(`${API_BASE}/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      setCurrentConversationId(data.id);
      setMessages([]);
      fetchConversations();
    } catch (e) {
      console.error('Failed to create conversation:', e);
    }
  };

  const queueOpportunity = async (id: string) => {
    try {
      await fetch(`${API_BASE}/opportunities/${id}/queue`, { method: 'POST' });
      setOpportunities((prev) => prev.filter((o) => o.id !== id));
    } catch (e) {
      console.error('Failed to queue opportunity:', e);
    }
  };

  const rejectOpportunity = async (id: string) => {
    try {
      await fetch(`${API_BASE}/opportunities/${id}/reject`, { method: 'POST' });
      setOpportunities((prev) => prev.filter((o) => o.id !== id));
    } catch (e) {
      console.error('Failed to reject opportunity:', e);
    }
  };

  const refineOpportunity = async (id: string, prompt: string) => {
    try {
      await fetch(`${API_BASE}/opportunities/${id}/refine`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      setOpportunities((prev) =>
        prev.map((o) => (o.id === id ? { ...o, prompt } : o))
      );
    } catch (e) {
      console.error('Failed to refine opportunity:', e);
    }
  };

  const editMessage = async (messageId: string, content: string) => {
    try {
      const res = await fetch(`${API_BASE}/messages/${messageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });

      if (!res.ok) {
        throw new Error('Failed to edit message');
      }

      // Update local messages if editing current conversation
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, content } : m))
      );
    } catch (e) {
      console.error('Failed to edit message:', e);
      throw e;
    }
  };

  const handleSearchResultClick = (conversationId: string) => {
    setCurrentConversationId(conversationId);
    setShowSearch(false);
  };

  // Request notification permission on first interaction
  useEffect(() => {
    const handleInteraction = () => {
      requestPermission();
      document.removeEventListener('click', handleInteraction);
    };
    document.addEventListener('click', handleInteraction);
    return () => document.removeEventListener('click', handleInteraction);
  }, []);

  return (
    <React.Fragment>
      <div className="flex h-screen bg-slate-900">
      {/* Sidebar */}
      <ConversationSidebar
        conversations={conversations}
        currentId={currentConversationId}
        onSelect={setCurrentConversationId}
        onNew={createNewConversation}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-16 border-b border-slate-700 flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🪵</span>
            <h1 className="text-xl font-bold text-white">Makerlog</h1>
            {isSpeaking && (
              <button
                onClick={stopSpeaking}
                className="text-xs bg-slate-700 px-3 py-1 rounded text-slate-300 btn-press focus-ring min-h-[36px]"
                aria-label="Stop speaking"
              >
                🔊 Stop
              </button>
            )}
          </div>
          <div className="flex gap-2 overflow-x-auto">
            <button
              onClick={() => {
                setShowGamification(!showGamification);
                setShowQuota(false);
                setShowSearch(false);
                setShowDailyLog(false);
                setShowOpportunities(false);
              }}
              aria-pressed={showGamification}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition relative btn-press focus-ring min-h-[44px] whitespace-nowrap ${
                showGamification
                  ? 'bg-yellow-500 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              🏆 Achievements
            </button>
            <button
              onClick={() => {
                setShowQuota(!showQuota);
                setShowGamification(false);
                setShowSearch(false);
                setShowDailyLog(false);
                setShowOpportunities(false);
              }}
              aria-pressed={showQuota}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition btn-press focus-ring min-h-[44px] whitespace-nowrap ${
                showQuota
                  ? 'bg-orange-500 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              ⚡ Quota
            </button>
            <button
              onClick={() => {
                setShowSearch(!showSearch);
                setShowGamification(false);
                setShowQuota(false);
                setShowDailyLog(false);
                setShowOpportunities(false);
              }}
              aria-pressed={showSearch}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition btn-press focus-ring min-h-[44px] whitespace-nowrap ${
                showSearch
                  ? 'bg-purple-500 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              🔍 Search
            </button>
            <button
              onClick={() => {
                setShowDailyLog(!showDailyLog);
                setShowGamification(false);
                setShowOpportunities(false);
                setShowSearch(false);
                setShowQuota(false);
              }}
              aria-pressed={showDailyLog}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition btn-press focus-ring min-h-[44px] whitespace-nowrap ${
                showDailyLog
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              📅 Daily Log
            </button>
            <button
              onClick={() => {
                setShowOpportunities(!showOpportunities);
                setShowGamification(false);
                setShowDailyLog(false);
                setShowSearch(false);
                setShowQuota(false);
              }}
              aria-pressed={showOpportunities}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition relative btn-press focus-ring min-h-[44px] whitespace-nowrap ${
                showOpportunities
                  ? 'bg-green-500 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              ✨ Opportunities
              {opportunities.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {opportunities.length}
                </span>
              )}
            </button>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          {/* Messages */}
          <div className="flex-1 flex flex-col">
            <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
              {isProcessing && messages.length === 0 ? (
                <>
                  <MessageSkeleton />
                  <MessageSkeleton />
                </>
              ) : messages.length === 0 ? (
                <EmptyState
                  icon="🎤"
                  title="Hold to talk"
                  description="Talk through your ideas. I'll listen, respond, and detect opportunities for overnight generation."
                />
              ) : (
                <>
                  {messages.map((msg) => (
                    <MessageBubble key={msg.id} message={msg} />
                  ))}
                  {isProcessing && <MessageSkeleton />}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Error State */}
            {error && (
              <div className="px-6 pb-2">
                <ErrorAlert
                  message={error}
                  onDismiss={() => {
                    // Clear error via transcript setter
                    setTranscript(null);
                  }}
                />
              </div>
            )}

            {/* Record Button */}
            <div className="p-8 flex flex-col items-center">
              <RecordButton
                isRecording={isRecording}
                isProcessing={isProcessing}
                duration={recordingState.duration}
                onStart={handleRecordingStart}
                onStop={handleRecordingStop}
              />
              <p className="text-slate-500 text-sm mt-4" role="status" aria-live="polite">
                {error ? '' : isRecording
                  ? 'Release to send'
                  : isProcessing
                    ? 'Processing...'
                    : 'Hold to speak'
                }
              </p>
            </div>
          </div>

          {/* Screenshot Preview */}
          {screenshot && (
            <div className="fixed bottom-4 right-4 bg-slate-800 rounded-lg shadow-2xl border border-slate-700 p-4 w-80 z-50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-white">📸 Screenshot Pasted</h3>
                <button
                  onClick={clearScreenshot}
                  className="text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              <img
                src={screenshot.url}
                alt="Screenshot"
                className="w-full rounded-lg mb-3"
              />
              {analysis ? (
                <div className="bg-slate-900 rounded-lg p-3 mb-3">
                  <p className="text-xs text-slate-300">{analysis}</p>
                </div>
              ) : null}
              <div className="flex gap-2">
                <button
                  onClick={analyzeScreenshot}
                  disabled={analyzing}
                  className="flex-1 text-xs bg-blue-500 hover:bg-blue-400 text-white py-2 rounded transition disabled:opacity-50"
                >
                  {analyzing ? 'Analyzing...' : 'Analyze'}
                </button>
                <button
                  onClick={clearScreenshot}
                  className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded transition"
                >
                  Clear
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                💡 Tip: Paste Ctrl+V anywhere to add screenshots
              </p>
            </div>
          )}

          {/* Side Panels */}
          {showGamification && (
            <div className="w-96 border-l border-slate-700 overflow-hidden">
              <GamificationPanel />
            </div>
          )}

          {showQuota && !showGamification && (
            <div className="w-80 border-l border-slate-700 overflow-hidden">
              <QuotaDashboard />
            </div>
          )}

          {showSearch && !showQuota && (
            <div className="w-96 border-l border-slate-700 overflow-hidden">
              <SearchPanel onResultClick={handleSearchResultClick} />
            </div>
          )}

          {showDailyLog && !showSearch && (
            <div className="w-96 border-l border-slate-700 overflow-hidden">
              <DailyLogPanel
                selectedDate={selectedLogDate}
                onDateChange={setSelectedLogDate}
                onEditMessage={editMessage}
              />
            </div>
          )}

          {showOpportunities && !showDailyLog && (
            <div className="w-80 border-l border-slate-700 overflow-y-auto">
              <div className="p-4 border-b border-slate-700">
                <h2 className="text-lg font-bold text-white">
                  Tonight's Queue
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Tasks detected from your conversations
                </p>
              </div>
              <DailyDigestPanel
                opportunities={opportunities}
                onQueueOpportunity={queueOpportunity}
                onRejectOpportunity={rejectOpportunity}
                onRefineOpportunity={refineOpportunity}
              />
            </div>
          )}
        </div>
      </div>
    </div>

    {/* Notifications */}
    <NotificationPanel />
    </React.Fragment>
  );
}
