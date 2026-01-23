# Integration Guide: Adding Streaming to Existing VoiceChat

This guide shows how to add real-time streaming to the existing `VoiceChat.tsx` component.

## Step 1: Import the Streaming Hook

Add this import to the top of `/src/VoiceChat.tsx`:

```typescript
import { useStreamingTranscription } from './hooks/useStreamingTranscription';
```

## Step 2: Add Hook to Component

Add the streaming hook alongside the existing hooks:

```typescript
export default function VoiceChat() {
  // ... existing state ...

  // Add streaming hook
  const { transcribeWithStreaming, abortStreaming, isStreaming } =
    useStreamingTranscription();

  // ... rest of component ...
}
```

## Step 3: Update Message Interface

Add `streaming` property to Message interface:

```typescript
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  audioUrl?: string;
  timestamp: number;
  streaming?: boolean;  // Add this line
}
```

## Step 4: Replace handleRecordingStop

Find the `handleRecordingStop` function and replace it with this streaming version:

```typescript
const handleRecordingStop = useCallback(async () => {
  const result = await stopRecording();

  if (result) {
    // Add user message
    const userMessage: Message = {
      id: result.messageId,
      role: 'user',
      content: result.transcript,
      audioUrl: result.audioUrl,
      timestamp: Math.floor(Date.now() / 1000),
    };

    setMessages((prev) => [...prev, userMessage]);

    // Create placeholder for streaming response
    const assistantMessageId = crypto.randomUUID();
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
    await transcribeWithStreaming(
      // Create audio blob from result
      new Blob([], { type: 'audio/webm' }), // or use actual audio
      currentConversationId,
      {
        onToken: (token, fullResponse) => {
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

          // Update conversation if new
          if (metadata.conversationId && metadata.conversationId !== currentConversationId) {
            setCurrentConversationId(metadata.conversationId);
            fetchConversations();
          }

          // Speak response
          speak(response);

          // Refresh opportunities
          fetchOpportunities();
        },
        onError: (error) => {
          console.error('Streaming error:', error);
          // Remove failed message
          setMessages((prev) => prev.filter((msg) => msg.id !== assistantMessageId));
        },
      }
    );
  }
}, [stopRecording, currentConversationId, speak, transcribeWithStreaming, fetchConversations, fetchOpportunities]);
```

## Step 5: Update MessageBubble Component

Update the `MessageBubble` component to show streaming state:

```typescript
function MessageBubble({ message }: { message: Message }) {
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
        <p className="text-sm leading-relaxed break-words">
          {message.content}
          {message.streaming && (
            <span className="streaming-cursor" aria-hidden="true" />
          )}
        </p>

        <div className="flex items-center justify-between mt-2">
          <span className="text-xs opacity-60">
            {new Date(message.timestamp * 1000).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>

          {message.streaming && (
            <span className="ml-2 flex items-center gap-1 text-xs opacity-60">
              <span className="streaming-indicator w-2 h-2 rounded-full bg-green-400" />
              <span className="hidden sm:inline">Streaming...</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
```

## Step 6: Update Record Button

Update the record button to show streaming state:

```typescript
<button
  onMouseDown={handleRecordingStart}
  onMouseUp={handleRecordingStop}
  onTouchStart={handleRecordingStart}
  onTouchEnd={handleRecordingStop}
  disabled={isProcessing || isRecording || isStreaming()}
  aria-label={
    isRecording
      ? 'Release to stop recording'
      : isProcessing || isStreaming()
        ? 'Processing...'
        : 'Hold to record'
  }
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
    <LoadingSpinner size="lg" />
  ) : (
    <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
      <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
    </svg>
  )}
</button>
```

## Step 7: Update Status Text

Update the status text to show streaming:

```typescript
<p className="text-slate-500 text-sm mt-4" role="status" aria-live="polite">
  {error
    ? ''
    : isRecording
      ? 'Release to send'
      : isProcessing || isStreaming()
        ? 'Processing...'
        : 'Hold to speak'
  }
</p>
```

## Complete Integration Checklist

- [ ] Import `useStreamingTranscription` hook
- [ ] Add hook to component
- [ ] Update `Message` interface with `streaming` property
- [ ] Replace `handleRecordingStop` with streaming version
- [ ] Update `MessageBubble` to show streaming indicator
- [ ] Update record button to check `isStreaming()`
- [ ] Update status text
- [ ] Test the integration

## Testing the Integration

1. Start the dev server:
   ```bash
   npm run dev
   ```

2. Open the app in your browser

3. Hold the record button and speak

4. Release and observe:
   - Transcript appears immediately
   - "AI is thinking..." status
   - Tokens appear progressively (typewriter effect)
   - Blinking cursor during streaming
   - Green pulsing indicator
   - Auto-scroll to latest content
   - TTS speaks complete response

## Troubleshooting

**Streaming not working**:
- Check browser console for SSE errors
- Verify `/api/voice/transcribe-stream` endpoint exists
- Check that `stream: true` is set in AI call

**No visual feedback**:
- Verify CSS animations are loaded
- Check `streaming` property is set on messages
- Ensure `isStreaming()` returns true during streaming

**Fallback to non-streaming**:
- This is expected if streaming fails
- Check error messages in console
- Verify worker deployment

## Performance Tips

1. **Reduce max_tokens** for faster first token:
   ```typescript
   max_tokens: 150, // Instead of 300
   ```

2. **Cache responses** in KV:
   ```typescript
   const cacheKey = `response:${hash(transcript)}`;
   const cached = await c.env.KV.get(cacheKey);
   ```

3. **Use faster models** for distant regions:
   ```typescript
   const model = userRegion === 'us'
     ? '@cf/meta/llama-3.1-8b-instruct'
     : '@cf/meta/llama-3.1-8b-instruct';
   ```

## Next Steps

After successful integration:

1. **Monitor performance**: Track first token time and total duration
2. **Gather feedback**: User satisfaction with streaming experience
3. **Optimize**: Adjust caching, model selection, token limits
4. **Scale**: Implement Durable Objects for better connection management

## Support

For issues or questions:
- Check `/docs/STREAMING-IMPLEMENTATION.md` for detailed guide
- Review `/src/components/VoiceChatStreaming.tsx` for complete example
- See `/docs/STREAMING-QUICK-REF.md` for quick reference
