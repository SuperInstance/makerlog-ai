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

// Types
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  audioUrl?: string;
  timestamp: number;
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

const API_BASE = '/api';

// ============ HOOKS ============

function useVoiceRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      setError(null);
    } catch (err) {
      setError('Microphone access denied');
      console.error('Failed to start recording:', err);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  return { isRecording, audioBlob, error, startRecording, stopRecording, setAudioBlob };
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

function RecordButton({
  isRecording,
  isProcessing,
  onStart,
  onStop,
}: {
  isRecording: boolean;
  isProcessing: boolean;
  onStart: () => void;
  onStop: () => void;
}) {
  const handleMouseDown = () => {
    if (!isProcessing) onStart();
  };

  const handleMouseUp = () => {
    if (isRecording) onStop();
  };

  return (
    <button
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onTouchStart={handleMouseDown}
      onTouchEnd={handleMouseUp}
      disabled={isProcessing}
      className={`
        w-24 h-24 rounded-full flex items-center justify-center
        transition-all duration-200 select-none
        ${isRecording
          ? 'bg-red-500 scale-110 shadow-lg shadow-red-500/50 animate-pulse'
          : isProcessing
            ? 'bg-slate-600 cursor-not-allowed'
            : 'bg-blue-500 hover:bg-blue-400 hover:scale-105 active:scale-95'
        }
      `}
    >
      {isProcessing ? (
        <svg className="w-8 h-8 animate-spin text-white" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : (
        <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
          <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
        </svg>
      )}
    </button>
  );
}

function MessageBubble({ message, onPlayAudio }: { message: Message; onPlayAudio?: () => void }) {
  const isUser = message.role === 'user';
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-blue-500 text-white rounded-br-md'
            : 'bg-slate-700 text-white rounded-bl-md'
        }`}
      >
        <p className="text-sm leading-relaxed">{message.content}</p>
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs opacity-60">
            {new Date(message.timestamp * 1000).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
          {message.audioUrl && (
            <button
              onClick={onPlayAudio}
              className="text-xs opacity-60 hover:opacity-100 ml-2"
            >
              🔊
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
          className="w-full py-2 px-4 bg-blue-500 hover:bg-blue-400 rounded-lg text-white font-medium transition"
        >
          + New Conversation
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {conversations.map((conv) => (
          <button
            key={conv.id}
            onClick={() => onSelect(conv.id)}
            className={`w-full text-left p-4 border-b border-slate-800 transition ${
              conv.id === currentId
                ? 'bg-slate-800'
                : 'hover:bg-slate-800/50'
            }`}
          >
            <p className="text-sm text-white font-medium truncate">
              {conv.title || 'Untitled'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {conv.messageCount} messages
            </p>
          </button>
        ))}
        {conversations.length === 0 && (
          <p className="p-4 text-slate-500 text-sm text-center">
            No conversations yet
          </p>
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
    <div className="bg-slate-800 rounded-lg p-4 mb-3">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">{typeIcons[opportunity.type]}</span>
          <span className="text-sm font-medium text-white capitalize">
            {opportunity.type} Generation
          </span>
        </div>
        <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">
          {Math.round(opportunity.confidence * 100)}% match
        </span>
      </div>

      {isEditing ? (
        <div className="mb-3">
          <textarea
            value={editedPrompt}
            onChange={(e) => setEditedPrompt(e.target.value)}
            className="w-full bg-slate-700 text-white text-sm rounded-lg p-3 border border-slate-600 focus:border-blue-500 outline-none resize-none"
            rows={3}
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => {
                onRefine(editedPrompt);
                setIsEditing(false);
              }}
              className="text-xs bg-blue-500 text-white px-3 py-1 rounded"
            >
              Save
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="text-xs text-slate-400 px-3 py-1"
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
          className="flex-1 text-xs bg-green-500 hover:bg-green-400 text-white py-2 px-3 rounded transition"
        >
          Queue for Tonight
        </button>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="text-xs bg-slate-700 hover:bg-slate-600 text-white py-2 px-3 rounded transition"
        >
          Refine
        </button>
        <button
          onClick={onReject}
          className="text-xs text-slate-500 hover:text-slate-400 py-2 px-3 transition"
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

// ============ MAIN VOICE CHAT COMPONENT ============

export default function VoiceChat() {
  // State
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showOpportunities, setShowOpportunities] = useState(false);

  // Hooks
  const { isRecording, audioBlob, startRecording, stopRecording, setAudioBlob } = useVoiceRecorder();
  const { isSpeaking, speak, stop: stopSpeaking } = useSpeechSynthesis();
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

  // Process audio when recording stops
  useEffect(() => {
    if (audioBlob && !isRecording) {
      processAudio(audioBlob);
      setAudioBlob(null);
    }
  }, [audioBlob, isRecording]);

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

  const processAudio = async (blob: Blob) => {
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('audio', blob, 'recording.webm');
      if (currentConversationId) {
        formData.append('conversation_id', currentConversationId);
      }

      const res = await fetch(`${API_BASE}/voice/transcribe`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (data.transcript) {
        // Update conversation ID if new
        if (!currentConversationId && data.conversationId) {
          setCurrentConversationId(data.conversationId);
          fetchConversations();
        }

        // Add messages
        setMessages((prev) => [
          ...prev,
          {
            id: data.messageId,
            role: 'user',
            content: data.transcript,
            audioUrl: data.audioUrl,
            timestamp: Math.floor(Date.now() / 1000),
          },
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: data.response,
            timestamp: Math.floor(Date.now() / 1000),
          },
        ]);

        // Speak the response
        speak(data.response);

        // Refresh opportunities
        fetchOpportunities();
      }
    } catch (e) {
      console.error('Failed to process audio:', e);
    } finally {
      setIsProcessing(false);
    }
  };

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

  return (
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
                className="text-xs bg-slate-700 px-3 py-1 rounded text-slate-300"
              >
                🔊 Stop
              </button>
            )}
          </div>
          <button
            onClick={() => setShowOpportunities(!showOpportunities)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              showOpportunities
                ? 'bg-green-500 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            ✨ Opportunities {opportunities.length > 0 && `(${opportunities.length})`}
          </button>
        </header>

        <div className="flex-1 flex overflow-hidden">
          {/* Messages */}
          <div className="flex-1 flex flex-col">
            <div className="flex-1 overflow-y-auto p-6">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <span className="text-6xl mb-4">🎤</span>
                  <h2 className="text-xl font-medium text-white mb-2">
                    Hold to talk
                  </h2>
                  <p className="text-slate-500 max-w-md">
                    Talk through your ideas. I'll listen, respond, and detect
                    opportunities for overnight generation.
                  </p>
                </div>
              ) : (
                <>
                  {messages.map((msg) => (
                    <MessageBubble key={msg.id} message={msg} />
                  ))}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Record Button */}
            <div className="p-8 flex flex-col items-center">
              <RecordButton
                isRecording={isRecording}
                isProcessing={isProcessing}
                onStart={startRecording}
                onStop={stopRecording}
              />
              <p className="text-slate-500 text-sm mt-4">
                {isRecording
                  ? 'Release to send'
                  : isProcessing
                    ? 'Processing...'
                    : 'Hold to speak'}
              </p>
            </div>
          </div>

          {/* Opportunities Panel */}
          {showOpportunities && (
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
  );
}
