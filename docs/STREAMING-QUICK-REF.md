# Streaming Quick Reference Guide

## API Endpoint

```
POST /api/voice/transcribe-stream
```

**Request**:
```
Content-Type: multipart/form-data
X-User-Id: demo-user

Body:
- audio: Blob (audio/webm)
- conversation_id: string (optional)
```

**Response**: Server-Sent Events (SSE)

## SSE Events

```javascript
// Processing started
event: start
data: {"status":"processing"}

// Status update
event: status
data: {"step":"transcribing","message":"Transcribing audio..."}

// Transcript ready
event: transcript
data: {"transcript":"Hello world"}

// Token streamed
event: token
data: {"token":"Hello","fullResponse":"Hello"}

// Complete
event: complete
data: {
  "response":"Hello, how can I help?",
  "conversationId":"abc-123",
  "messageId":"msg-456",
  "audioUrl":"/assets/voice/..."
}

// Error
event: error
data: {"error":"Failed to process"}
```

## Hook Usage

```typescript
import { useStreamingTranscription } from '@/hooks/useStreamingTranscription';

function MyComponent() {
  const { transcribeWithStreaming, abortStreaming, isStreaming } =
    useStreamingTranscription();

  const handleStream = async (audioBlob: Blob) => {
    await transcribeWithStreaming(audioBlob, conversationId, {
      onTranscript: (transcript) => console.log(transcript),
      onToken: (token, fullResponse) => console.log(token),
      onComplete: (response, meta) => console.log('Done:', response),
      onError: (error) => console.error(error),
      onStatus: (status, message) => console.log(status, message),
    });
  };

  return <button onClick={() => handleStream(audio)}>Stream</button>;
}
```

## Component Usage

```typescript
import { StreamingMessageBubble } from '@/components/StreamingMessageBubble';

<StreamingMessageBubble
  content={message}
  isStreaming={isStreaming}
  role="assistant"
  timestamp={Date.now() / 1000}
  audioUrl="/assets/audio.webm"
  onStreamingComplete={() => console.log('Done')}
/>
```

## CSS Classes

```css
.streaming-cursor      /* Blinking cursor */
.streaming-token       /* Fade-in animation */
.streaming-indicator   /* Pulsing dot */
.streaming-content     /* Smooth scroll */
.streaming-shimmer     /* Loading effect */
```

## Quick Start

```bash
# 1. Start dev server
npm run dev

# 2. In your component
import { VoiceChatStreaming } from './components/VoiceChatStreaming';

# 3. Use it
<VoiceChatStreaming />

# 4. Or integrate into existing VoiceChat
import { useStreamingTranscription } from './hooks/useStreamingTranscription';
```

## Performance Tips

1. **First Token**: <500ms target
2. **Max Tokens**: 300 (balance speed vs quality)
3. **Timeout**: 25s client-side abort
4. **Cache**: 24h TTL in KV

## Error Handling

```typescript
try {
  await transcribeWithStreaming(audioBlob, conversationId);
} catch (error) {
  // Automatically falls back to non-streaming
  // Or handle manually
}
```

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14.1+
- Mobile: iOS Safari 14.5+, Chrome Android

## Common Issues

**No streaming**: Check browser console for SSE errors
**All at once**: Verify `stream: true` in AI call
**No cursor**: Check CSS animations loaded
**No scroll**: Verify ref attached to last element

## Files

- `/workers/api/src/index.ts` - Backend endpoint
- `/src/hooks/useStreamingTranscription.ts` - React hook
- `/src/components/StreamingMessageBubble.tsx` - Message component
- `/src/components/VoiceChatStreaming.tsx` - Example integration
- `/src/index.css` - Streaming animations
- `/docs/STREAMING-IMPLEMENTATION.md` - Full guide

## Monitoring

```typescript
// Track performance
const startTime = Date.now();
onComplete: (response) => {
  const duration = Date.now() - startTime;
  console.log(`Streaming: ${duration}ms`);
  console.log(`Tokens: ${response.split(' ').length}`);
}
```

## Testing

```bash
# Unit tests
npm run test

# Manual test
npm run dev
# Open http://localhost:5173
# Use VoiceChatStreaming component
```

## Deploy

```bash
# Worker
cd workers/api
npm run deploy

# Frontend
npm run build
wrangler pages deploy dist
```

## Support

- Docs: `/docs/STREAMING-IMPLEMENTATION.md`
- Examples: `/src/components/VoiceChatStreaming.tsx`
- Issues: Check browser console + Workers logs
