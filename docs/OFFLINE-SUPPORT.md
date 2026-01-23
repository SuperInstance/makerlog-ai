# Offline Support Documentation

Makerlog.ai includes comprehensive offline support that allows users to continue recording and working even when disconnected from the internet. All data is automatically synced when connection is restored.

## Features

### 1. IndexedDB Storage
- **Persistent storage** for recordings, messages, conversations, and opportunities
- **Automatic retry queue** for failed uploads
- **Conflict resolution** with timestamp-based merging
- **Storage statistics** for monitoring usage

### 2. Offline Recording
- **Record while offline** - Voice recordings are stored locally
- **Chunked uploads** - Large recordings are split into manageable chunks
- **Auto-sync on reconnect** - When you come back online, recordings automatically upload
- **Progress tracking** - See sync progress and pending uploads in real-time

### 3. Background Sync
- **Service worker integration** - Sync continues even when app is closed
- **Smart retry logic** - Exponential backoff for failed uploads
- **Max retry protection** - Prevents infinite retry loops
- **Manual sync trigger** - Users can force sync when needed

### 4. Offline UI Indicators
- **Online status badge** - Green when online, red when offline
- **Pending uploads counter** - Shows how many items need syncing
- **Sync progress bar** - Real-time sync progress
- **Offline banner** - Helpful message when offline
- **Manual sync button** - Trigger sync on demand

## Architecture

### Storage Layer (`src/lib/offlineStorage.ts`)

IndexedDB wrapper providing:
- **Recordings store**: Audio blobs with metadata
- **Messages store**: Chat messages for conversations
- **Conversations store**: Conversation metadata
- **Opportunities store**: Detected generation tasks
- **Sync queue store**: Retryable operations

```typescript
// Example: Save a recording offline
await offlineStorage.saveRecording({
  id: 'recording-123-chunk-0',
  blob: audioBlob,
  timestamp: Date.now(),
  uploaded: false,
  uploadAttempts: 0,
});
```

### Sync Hook (`src/hooks/useOfflineSync.ts`)

React hook managing:
- **Online/offline detection**
- **Automatic sync triggering**
- **Retry logic with exponential backoff**
- **Progress tracking**
- **Error handling**

```typescript
// Example: Use in component
const { syncStatus, manualSync } = useOfflineSync();

console.log(syncStatus.isOnline); // true/false
console.log(syncStatus.pendingUploads); // 5
await manualSync(); // Trigger sync
```

### Service Worker (`public/sw.js`)

Handles:
- **Cache management** - Network-first for API, cache-first for assets
- **Background sync** - Syncs data when connection restored
- **Offline fallback** - Returns cached data when offline
- **Periodic cleanup** - Removes old cache entries

## Usage

### Basic Setup

The service worker auto-registers in production. No additional setup needed.

### Recording Offline

1. **User goes offline** - Status indicator turns red
2. **Continue recording** - Works normally, data stored locally
3. **Come back online** - Automatic sync triggers
4. **Data synced** - Recordings uploaded to server

### Manual Sync

Users can trigger manual sync by:
1. Clicking "Sync Now" button in status bar
2. The button appears when there are pending uploads

### Error Handling

- **Failed uploads** - Automatically queued for retry
- **Max retries** - After 3 attempts, marked as failed
- **User notification** - Error shown in status bar
- **Retry failed** - Users can retry failed items

## API Reference

### `offlineStorage`

IndexedDB storage manager.

#### Methods

- `init()` - Initialize database
- `saveRecording(recording)` - Save audio recording
- `getPendingRecordings()` - Get unsynced recordings
- `addToQueue(item)` - Add sync operation to queue
- `getQueueItems()` - Get pending sync items
- `getStats()` - Get storage statistics

### `useOfflineSync()`

React hook for offline sync.

#### Returns

```typescript
{
  syncStatus: {
    isOnline: boolean;
    isSyncing: boolean;
    pendingUploads: number;
    lastSyncTime: number | null;
    syncError: string | null;
    syncProgress: {
      total: number;
      completed: number;
      failed: number;
    };
  };
  uploadRecordingChunk: (blob, recordingId, chunkIndex, isFinal) => Promise<boolean>;
  finalizeRecording: (recordingId, conversationId) => Promise<any>;
  triggerSync: () => Promise<void>;
  manualSync: () => Promise<void>;
  clearOfflineData: () => Promise<void>;
  retryFailedItems: () => Promise<void>;
}
```

### `swManager`

Service worker manager.

#### Methods

- `register()` - Register service worker
- `getStatus()` - Get SW status
- `skipWaiting()` - Activate waiting SW
- `clearCache()` - Clear all caches
- `triggerSync(tag)` - Trigger background sync
- `getCacheStats()` - Get cache statistics

## Data Flow

### Recording Flow

1. **Start recording** - MediaRecorder captures audio
2. **Chunk creation** - Audio split into 10-second chunks
3. **Upload attempt** - Try to upload each chunk
4. **Offline fallback** - If offline, store in IndexedDB
5. **Queue for sync** - Add to retry queue
6. **Auto-sync** - When online, process queue

### Sync Flow

1. **Connection restored** - Browser fires 'online' event
2. **Queue processing** - Process items in order (oldest first)
3. **Retry logic** - Failed items retry with exponential backoff
4. **Max retries** - After 3 attempts, mark as failed
5. **Progress updates** - UI shows sync progress
6. **Completion** - User notified when complete

## Configuration

### Constants

```typescript
// Maximum retry attempts
const MAX_RETRY_ATTEMPTS = 3;

// Base retry delay (5 seconds)
const RETRY_DELAY_BASE = 5000;

// Sync cooldown (30 seconds)
const SYNC_COOLDOWN = 30000;

// IndexedDB
const DB_NAME = 'makerlog-offline';
const DB_VERSION = 1;
```

### Cache Strategy

- **API requests**: Network-first with cache fallback
- **Assets**: Cache-first with network update
- **POST/PUT/DELETE**: Queued for sync when offline

## Testing

### Test Offline Recording

1. **Open DevTools** - Application tab
2. **Enable offline mode** - "Offline" checkbox
3. **Record audio** - Should work normally
4. **Check IndexedDB** - Verify data stored
5. **Go online** - Verify sync triggers
6. **Check uploads** - Verify recordings uploaded

### Test Sync Queue

1. **Go offline**
2. **Create multiple recordings**
3. **Go online**
4. **Watch sync progress** - Should see progress bar
5. **Verify all uploads** - Check server for recordings

## Troubleshooting

### Sync Not Triggering

- **Check service worker** - Ensure SW is active
- **Check permissions** - Ensure notifications allowed
- **Check IndexedDB** - Verify queue has items
- **Manual trigger** - Use "Sync Now" button

### Uploads Failing

- **Check network** - Verify internet connection
- **Check server** - Ensure API is accessible
- **Check quota** - Verify storage quota available
- **Clear queue** - Use `clearOfflineData()` if stuck

### Storage Quota Exceeded

- **Clear old data** - Remove old recordings
- **Check usage** - Use `getStats()` to see size
- **Request more quota** - Browser may prompt user

## Performance Considerations

- **IndexedDB is async** - All operations return promises
- **Large blobs** - Recordings stored as blobs, not base64
- **Batch operations** - Multiple items synced in parallel
- **Throttle syncs** - 30-second cooldown between syncs
- **Cache limits** - Old cache entries cleaned after 7 days

## Security & Privacy

- **Local storage only** - Data never leaves device without permission
- **Encrypted transit** - HTTPS for all uploads
- **User control** - Users can clear offline data anytime
- **No tracking** - Offline status not used for analytics

## Browser Support

- **Chrome/Edge**: Full support
- **Firefox**: Full support
- **Safari**: Full support (iOS 16.4+)
- **Opera**: Full support

### Required APIs

- IndexedDB
- Service Workers
- Cache API
- Background Sync (Chrome/Edge only)
- MediaRecorder

## Future Enhancements

- [ ] Periodic sync for queued items
- [ ] Compression for large recordings
- [ ] Differential sync for messages
- [ ] Conflict resolution UI
- [ ] Offline mode indicator in app icon
- [ ] Background sync on Safari

## Related Files

- `src/lib/offlineStorage.ts` - IndexedDB wrapper
- `src/hooks/useOfflineSync.ts` - Sync management
- `src/components/OfflineStatusIndicator.tsx` - UI components
- `public/sw.js` - Service worker
- `public/offline.html` - Offline fallback page
- `src/lib/serviceWorkerRegistration.ts` - SW manager

## Support

For issues or questions:
1. Check browser console for errors
2. Verify service worker is active
3. Check IndexedDB for queued items
4. Review network tab for failed requests
5. File issue on GitHub with details
