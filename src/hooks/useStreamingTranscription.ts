/**
 * useStreamingTranscription Hook
 *
 * Handles streaming AI responses with Server-Sent Events (SSE).
 * Provides real-time token-by-token streaming with visual feedback.
 */

import { useRef, useCallback } from 'react';
import { API_BASE } from '../config/api';

interface StreamingOptions {
  onTranscript?: (transcript: string) => void;
  onToken?: (token: string, fullResponse: string) => void;
  onComplete?: (response: string, metadata: any) => void;
  onError?: (error: string) => void;
  onStatus?: (status: string, message: string) => void;
}

interface StreamingState {
  isStreaming: boolean;
  abortController: AbortController | null;
}

/**
 * Hook for streaming voice transcription with real-time AI responses
 */
export function useStreamingTranscription() {
  const streamingStateRef = useRef<StreamingState>({
    isStreaming: false,
    abortController: null,
  });

  /**
   * Transcribe audio with streaming AI response
   */
  const transcribeWithStreaming = useCallback(
    async (
      audioBlob: Blob,
      conversationId: string | null,
      options: StreamingOptions = {}
    ) => {
      const {
        onTranscript,
        onToken,
        onComplete,
        onError,
        onStatus,
      } = options;

      // Abort any existing stream
      if (streamingStateRef.current.abortController) {
        streamingStateRef.current.abortController.abort();
      }

      // Create new abort controller
      const abortController = new AbortController();
      streamingStateRef.current = {
        isStreaming: true,
        abortController,
      };

      try {
        // Prepare form data
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');
        if (conversationId) {
          formData.append('conversation_id', conversationId);
        }

        // Start streaming request
        onStatus?.('connecting', 'Connecting to AI...');

        const response = await fetch(`${API_BASE}/voice/transcribe-stream`, {
          method: 'POST',
          headers: {
            'X-User-Id': 'demo-user',
          },
          body: formData,
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        if (!response.body) {
          throw new Error('Response body is null');
        }

        // Parse SSE stream
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let currentTranscript = '';
        let currentResponse = '';

        onStatus?.('processing', 'Processing audio...');

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          // Decode chunk and add to buffer
          buffer += decoder.decode(value, { stream: true });

          // Process complete SSE messages
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer

          for (const line of lines) {
            if (line.startsWith('event: ')) {
              const event = line.slice(7).trim();
              continue; // Event type is handled with next data line
            }

            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim();

              try {
                const parsed = JSON.parse(data);

                // Handle different event types
                switch (parsed.event || 'data') {
                  case 'start':
                    onStatus?.('started', 'Processing started');
                    break;

                  case 'status':
                    onStatus?.(parsed.step, parsed.message);
                    break;

                  case 'transcript':
                    currentTranscript = parsed.transcript;
                    onTranscript?.(currentTranscript);
                    break;

                  case 'token':
                    currentResponse = parsed.fullResponse;
                    onToken?.(parsed.token, currentResponse);
                    break;

                  case 'complete':
                    streamingStateRef.current.isStreaming = false;
                    onComplete?.(parsed.response, {
                      conversationId: parsed.conversationId,
                      messageId: parsed.messageId,
                      audioUrl: parsed.audioUrl,
                    });
                    break;

                  case 'error':
                    streamingStateRef.current.isStreaming = false;
                    onError?.(parsed.error || 'Unknown error');
                    break;
                }
              } catch (e) {
                // Skip invalid JSON
                console.warn('Failed to parse SSE data:', data, e);
              }
            }
          }

          // Check if aborted
          if (abortController.signal.aborted) {
            break;
          }
        }

        streamingStateRef.current.isStreaming = false;
      } catch (error: any) {
        streamingStateRef.current.isStreaming = false;

        if (error.name === 'AbortError') {
          onError?.('Streaming aborted');
        } else {
          console.error('Streaming transcription error:', error);
          onError?.(error.message || 'Failed to transcribe audio');
        }
      } finally {
        streamingStateRef.current.abortController = null;
      }
    },
    []
  );

  /**
   * Abort current streaming request
   */
  const abortStreaming = useCallback(() => {
    if (streamingStateRef.current.abortController) {
      streamingStateRef.current.abortController.abort();
      streamingStateRef.current = {
        isStreaming: false,
        abortController: null,
      };
    }
  }, []);

  /**
   * Check if currently streaming
   */
  const isStreaming = useCallback(() => {
    return streamingStateRef.current.isStreaming;
  }, []);

  return {
    transcribeWithStreaming,
    abortStreaming,
    isStreaming,
  };
}
