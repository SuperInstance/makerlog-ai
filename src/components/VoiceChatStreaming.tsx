/**
 * VoiceChatStreaming Component
 *
 * Enhanced voice chat with real-time AI response streaming.
 * This component demonstrates the integration of streaming functionality.
 *
 * Features:
 * - Real-time token streaming with typewriter effect
 * - Visual feedback during processing
 * - Auto-scroll to latest message
 * - Graceful fallback to non-streaming mode
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useStreamingTranscription } from '../hooks/useStreamingTranscription';
import { useProgressiveRecorder } from '../hooks/useProgressiveRecorder';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis';
import StreamingMessageBubble from './StreamingMessageBubble';
import { API_BASE } from '../config/api';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  audioUrl?: string;
  timestamp: number;
  streaming?: boolean;
}

interface Conversation {
  id: string;
  title: string;
  updatedAt: number;
  messageCount: number;
}

interface VoiceChatStreamingProps {
  conversationId?: string | null;
  onConversationChange?: (id: string) => void;
}

export function VoiceChatStreaming({
  conversationId: initialConversationId,
  onConversationChange,
}: VoiceChatStreamingProps) {
  // State
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(
    initialConversationId || null
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingStatus, setStreamingStatus] = useState<string>('');
  const [streamingMessage, setStreamingMessage] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Hooks
  const { isRecording, isProcessing: recorderProcessing, transcript, recordingState, startRecording, stopRecording, setTranscript } = useProgressiveRecorder();
  const { transcribeWithStreaming, abortStreaming, isStreaming } = useStreamingTranscription();
  const { isSpeaking, speak, stop: stopSpeaking } = useSpeechSynthesis();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const currentStreamMessageIdRef = useRef<string | null>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingMessage]);

  // Load conversations on mount
  useEffect(() => {
    fetchConversations();
  }, []);

  // Load messages when conversation changes
  useEffect(() => {
    if (currentConversationId) {
      fetchMessages(currentConversationId);
    }
  }, [currentConversationId]);

  // Process transcript when ready (non-streaming path)
  useEffect(() => {
    if (transcript) {
      handleTranscriptReady(transcript);
      setTranscript(null);
    }
  }, [transcript]);

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

  const handleTranscriptReady = useCallback(async (transcriptText: string) => {
    // Add user message
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: transcriptText,
      timestamp: Math.floor(Date.now() / 1000),
    };

    setMessages((prev) => [...prev, userMessage]);

    // Use streaming transcription
    if (audioChunksRef.current.length > 0) {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      audioChunksRef.current = [];

      setIsProcessing(true);
      setStreamingMessage('');
      currentStreamMessageIdRef.current = null;

      // Create placeholder for streaming message
      const assistantMessageId = crypto.randomUUID();
      currentStreamMessageIdRef.current = assistantMessageId;

      setMessages((prev) => [
        ...prev,
        {
          id: assistantMessageId,
          role: 'assistant',
          content: '',
          timestamp: Math.floor(Date.now() / 1000),
          streaming: true,
        },
      ]);

      // Start streaming
      await transcribeWithStreaming(audioBlob, currentConversationId, {
        onTranscript: (transcript) => {
          console.log('Transcript:', transcript);
        },
        onToken: (token, fullResponse) => {
          setStreamingMessage(fullResponse);
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? { ...msg, content: fullResponse, streaming: true }
                : msg
            )
          );
        },
        onComplete: (response, metadata) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? { ...msg, content: response, streaming: false }
                : msg
            )
          );

          // Update conversation ID if new
          if (metadata.conversationId && metadata.conversationId !== currentConversationId) {
            setCurrentConversationId(metadata.conversationId);
            onConversationChange?.(metadata.conversationId);
            fetchConversations();
          }

          setIsProcessing(false);
          setStreamingMessage('');

          // Speak the response
          speak(response);
        },
        onError: (error) => {
          console.error('Streaming error:', error);
          setIsProcessing(false);
          setStreamingMessage('');

          // Remove failed message
          setMessages((prev) => prev.filter((msg) => msg.id !== assistantMessageId));
        },
        onStatus: (status, message) => {
          setStreamingStatus(message);
        },
      });
    }
  }, [currentConversationId, transcribeWithStreaming, speak, onConversationChange]);

  const handleRecordingStart = useCallback(() => {
    audioChunksRef.current = [];
    startRecording();
  }, [startRecording]);

  const handleRecordingStop = useCallback(async () => {
    // The progressive recorder will handle the upload
    // We'll process the transcript when it's ready
    await stopRecording();
  }, [stopRecording]);

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

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <span className="text-6xl mb-4">🎤</span>
            <h2 className="text-xl font-medium text-white mb-2">Hold to talk</h2>
            <p className="text-slate-500 max-w-md">
              Talk through your ideas. I'll listen, respond in real-time, and detect opportunities for overnight generation.
            </p>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <StreamingMessageBubble
                key={msg.id}
                content={msg.content}
                role={msg.role}
                timestamp={msg.timestamp}
                audioUrl={msg.audioUrl}
                isStreaming={msg.streaming}
                onStreamingComplete={() => {
                  if (msg.id === currentStreamMessageIdRef.current) {
                    currentStreamMessageIdRef.current = null;
                  }
                }}
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}

        {/* Processing Indicator */}
        {(isProcessing || isStreaming()) && streamingMessage === '' && (
          <div className="flex mb-4 fade-in">
            <div className="bg-slate-700 rounded-2xl px-4 py-3 shadow-lg">
              <div className="flex items-center gap-2">
                <div className="streaming-indicator w-2 h-2 rounded-full bg-green-400" />
                <span className="text-sm text-slate-300">{streamingStatus || 'Processing...'}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Recording Controls */}
      <div className="p-8 flex flex-col items-center border-t border-slate-700">
        <button
          onMouseDown={handleRecordingStart}
          onMouseUp={handleRecordingStop}
          onTouchStart={handleRecordingStart}
          onTouchEnd={handleRecordingStop}
          disabled={isProcessing || isRecording || isStreaming()}
          aria-label={isRecording ? 'Release to stop recording' : isProcessing ? 'Processing...' : 'Hold to record'}
          className={`
            w-24 h-24 rounded-full flex items-center justify-center
            transition-all duration-200 select-none
            min-w-[44px] min-h-[44px] touch-manipulation
            ${isRecording
              ? 'bg-red-500 scale-110 shadow-lg shadow-red-500/50 animate-pulse'
              : isProcessing || isStreaming()
                ? 'bg-slate-600 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-400 hover:scale-105 active:scale-95'
            }
          `}
        >
          {isProcessing || isStreaming() ? (
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
            </svg>
          )}
        </button>

        {isRecording && recordingState.duration > 0 && (
          <div className="mt-3 px-3 py-1 bg-slate-800 rounded-full fade-in">
            <span className="text-sm font-mono text-red-400" aria-live="polite">
              {formatDuration(recordingState.duration)}
            </span>
          </div>
        )}

        {isSpeaking && (
          <button
            onClick={stopSpeaking}
            className="mt-4 text-xs bg-slate-700 px-3 py-1 rounded text-slate-300 btn-press focus-ring min-h-[36px]"
            aria-label="Stop speaking"
          >
            🔊 Stop Speaking
          </button>
        )}

        <p className="text-slate-500 text-sm mt-4" role="status" aria-live="polite">
          {isRecording
            ? 'Release to send'
            : isProcessing || isStreaming()
              ? 'Processing...'
              : 'Hold to speak'
          }
        </p>
      </div>

      {/* New Conversation Button */}
      <div className="px-8 pb-4">
        <button
          onClick={createNewConversation}
          className="w-full py-2 px-4 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-medium transition btn-press focus-ring min-h-[44px]"
        >
          + New Conversation
        </button>
      </div>
    </div>
  );
}

export default VoiceChatStreaming;
