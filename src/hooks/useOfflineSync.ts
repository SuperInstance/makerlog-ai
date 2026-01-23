/**
 * useOfflineSync Hook
 *
 * Manages offline/sync state and automatic syncing when connection is restored.
 * Handles recording uploads, message syncing, and conflict resolution.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { offlineStorage, OfflineRecording, SyncQueueItem } from '../lib/offlineStorage';
import { API_BASE } from '../config/api';

export interface SyncStatus {
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
}

const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_BASE = 5000; // 5 seconds
const SYNC_COOLDOWN = 30000; // 30 seconds between syncs

export function useOfflineSync() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: navigator.onLine,
    isSyncing: false,
    pendingUploads: 0,
    lastSyncTime: null,
    syncError: null,
    syncProgress: { total: 0, completed: 0, failed: 0 },
  });

  const syncInProgressRef = useRef(false);
  const lastSyncTimeRef = useRef<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Update online status
  useEffect(() => {
    const handleOnline = () => {
      setSyncStatus((prev) => ({ ...prev, isOnline: true, syncError: null }));
      // Trigger sync when coming back online
      triggerSync();
    };

    const handleOffline = () => {
      setSyncStatus((prev) => ({ ...prev, isOnline: false }));
      // Cancel any ongoing sync
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Update pending uploads count periodically
  useEffect(() => {
    const updatePendingCount = async () => {
      try {
        await offlineStorage.init();
        const stats = await offlineStorage.getStats();
        setSyncStatus((prev) => ({
          ...prev,
          pendingUploads: stats.pendingRecordings + stats.queueItems,
        }));
      } catch (error) {
        console.error('Failed to update pending count:', error);
      }
    };

    updatePendingCount();
    const interval = setInterval(updatePendingCount, 10000); // Every 10 seconds

    return () => clearInterval(interval);
  }, []);

  /**
   * Upload a recording chunk with offline fallback
   */
  const uploadRecordingChunk = useCallback(
    async (blob: Blob, recordingId: string, chunkIndex: number, isFinal: boolean): Promise<boolean> => {
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
          throw new Error('Upload failed');
        }

        return true;
      } catch (error) {
        // If offline or upload fails, store for later
        console.warn('Upload failed, storing offline:', error);

        await offlineStorage.init();

        // Store the recording chunk
        await offlineStorage.saveRecording({
          id: `${recordingId}-${chunkIndex}`,
          blob,
          timestamp: Date.now(),
          uploaded: false,
          uploadAttempts: 0,
        });

        // Add to sync queue
        await offlineStorage.addToQueue({
          type: 'recording',
          action: 'create',
          data: {
            blob,
            recordingId,
            chunkIndex,
            isFinal,
          },
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        setSyncStatus((prev) => ({
          ...prev,
          pendingUploads: prev.pendingUploads + 1,
        }));

        return false;
      }
    },
    [API_BASE]
  );

  /**
   * Finalize recording with offline fallback
   */
  const finalizeRecording = useCallback(
    async (recordingId: string, conversationId: string | null) => {
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

        return await response.json();
      } catch (error) {
        console.error('Finalize failed:', error);
        throw error;
      }
    },
    [API_BASE]
  );

  /**
   * Sync all pending items
   */
  const triggerSync = useCallback(async () => {
    // Prevent concurrent syncs
    if (syncInProgressRef.current) {
      console.log('Sync already in progress');
      return;
    }

    // Check cooldown
    if (lastSyncTimeRef.current && Date.now() - lastSyncTimeRef.current < SYNC_COOLDOWN) {
      console.log('Sync cooldown active');
      return;
    }

    // Check if online
    if (!navigator.onLine) {
      console.log('Offline, skipping sync');
      return;
    }

    syncInProgressRef.current = true;
    abortControllerRef.current = new AbortController();

    setSyncStatus((prev) => ({
      ...prev,
      isSyncing: true,
      syncError: null,
      syncProgress: { total: 0, completed: 0, failed: 0 },
    }));

    try {
      await offlineStorage.init();

      // Get all queue items
      const queueItems = await offlineStorage.getQueueItems();

      setSyncStatus((prev) => ({
        ...prev,
        syncProgress: { total: queueItems.length, completed: 0, failed: 0 },
      }));

      let completed = 0;
      let failed = 0;

      // Process each item
      for (const item of queueItems) {
        // Check if aborted
        if (abortControllerRef.current?.signal.aborted) {
          break;
        }

        const success = await processQueueItem(item);

        if (success) {
          completed++;
          await offlineStorage.removeQueueItem(item.id!);
        } else {
          failed++;
          item.retryCount++;
          item.lastAttempt = Date.now();

          if (item.retryCount >= MAX_RETRY_ATTEMPTS) {
            item.error = 'Max retries reached';
          }

          await offlineStorage.updateQueueItem(item);
        }

        setSyncStatus((prev) => ({
          ...prev,
          syncProgress: {
            total: queueItems.length,
            completed,
            failed,
          },
        }));
      }

      // Also sync pending recordings
      const pendingRecordings = await offlineStorage.getPendingRecordings();
      for (const recording of pendingRecordings) {
        if (abortControllerRef.current?.signal.aborted) break;

        const success = await uploadStoredRecording(recording);
        if (success) {
          await offlineStorage.deleteRecording(recording.id);
        }
      }

      lastSyncTimeRef.current = Date.now();
      setSyncStatus((prev) => ({
        ...prev,
        isSyncing: false,
        lastSyncTime: Date.now(),
        pendingUploads: 0,
      }));
    } catch (error) {
      console.error('Sync failed:', error);
      setSyncStatus((prev) => ({
        ...prev,
        isSyncing: false,
        syncError: error instanceof Error ? error.message : 'Sync failed',
      }));
    } finally {
      syncInProgressRef.current = false;
      abortControllerRef.current = null;
    }
  }, []);

  /**
   * Process a single queue item
   */
  const processQueueItem = async (item: SyncQueueItem): Promise<boolean> => {
    const { type, action, data, retryCount } = item;

    // Exponential backoff
    if (retryCount > 0) {
      const delay = RETRY_DELAY_BASE * Math.pow(2, retryCount - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    try {
      switch (type) {
        case 'recording':
          return await syncRecording(data);
        case 'message':
          return await syncMessage(action, data);
        case 'conversation':
          return await syncConversation(action, data);
        case 'opportunity':
          return await syncOpportunity(action, data);
        default:
          console.warn('Unknown sync item type:', type);
          return false;
      }
    } catch (error) {
      console.error(`Failed to sync ${type}:`, error);
      item.error = error instanceof Error ? error.message : 'Unknown error';
      return false;
    }
  };

  /**
   * Sync a recording
   */
  const syncRecording = async (data: any): Promise<boolean> => {
    const { blob, recordingId, chunkIndex, isFinal } = data;

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

      return response.ok;
    } catch (error) {
      console.error('Recording sync failed:', error);
      return false;
    }
  };

  /**
   * Sync a message
   */
  const syncMessage = async (action: string, data: any): Promise<boolean> => {
    try {
      switch (action) {
        case 'create':
          const response = await fetch(`${API_BASE}/conversations/${data.conversationId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              role: data.role,
              content: data.content,
            }),
          });
          return response.ok;
        case 'update':
          const updateResponse = await fetch(`${API_BASE}/messages/${data.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: data.content }),
          });
          return updateResponse.ok;
        default:
          return false;
      }
    } catch (error) {
      console.error('Message sync failed:', error);
      return false;
    }
  };

  /**
   * Sync a conversation
   */
  const syncConversation = async (action: string, data: any): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE}/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      return response.ok;
    } catch (error) {
      console.error('Conversation sync failed:', error);
      return false;
    }
  };

  /**
   * Sync an opportunity
   */
  const syncOpportunity = async (action: string, data: any): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE}/opportunities/${data.id}/queue`, {
        method: 'POST',
      });
      return response.ok;
    } catch (error) {
      console.error('Opportunity sync failed:', error);
      return false;
    }
  };

  /**
   * Upload a stored recording
   */
  const uploadStoredRecording = async (recording: OfflineRecording): Promise<boolean> => {
    const { blob, id, uploadAttempts } = recording;

    try {
      // Extract recording info from ID
      const [recordingId, chunkIndexStr] = id.split('-');
      const chunkIndex = parseInt(chunkIndexStr, 10);
      const isFinal = id.includes('-final');

      const formData = new FormData();
      formData.append('audio', blob, `chunk-${chunkIndex}.webm`);
      formData.append('recording_id', recordingId);
      formData.append('chunk_index', chunkIndex.toString());
      formData.append('is_final', isFinal.toString());

      const response = await fetch(`${API_BASE}/voice/upload-chunk`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        await offlineStorage.deleteRecording(id);
        return true;
      }

      // Update attempt count
      recording.uploadAttempts = uploadAttempts + 1;
      recording.lastAttempt = Date.now();
      await offlineStorage.updateRecording(recording);

      return false;
    } catch (error) {
      console.error('Stored recording upload failed:', error);
      return false;
    }
  };

  /**
   * Manual sync trigger
   */
  const manualSync = useCallback(async () => {
    lastSyncTimeRef.current = null; // Reset cooldown
    await triggerSync();
  }, [triggerSync]);

  /**
   * Clear all offline data
   */
  const clearOfflineData = useCallback(async () => {
    try {
      await offlineStorage.init();
      await offlineStorage.clearAll();
      setSyncStatus((prev) => ({
        ...prev,
        pendingUploads: 0,
        syncError: null,
      }));
    } catch (error) {
      console.error('Failed to clear offline data:', error);
      throw error;
    }
  }, []);

  /**
   * Retry failed sync items
   */
  const retryFailedItems = useCallback(async () => {
    try {
      await offlineStorage.init();

      // Get failed items (with retryCount > 0 but < MAX)
      const queueItems = await offlineStorage.getQueueItems();
      const failedItems = queueItems.filter(
        (item) => item.retryCount > 0 && item.retryCount < MAX_RETRY_ATTEMPTS
      );

      // Reset retry counts
      for (const item of failedItems) {
        item.retryCount = 0;
        item.error = undefined;
        await offlineStorage.updateQueueItem(item);
      }

      // Trigger sync
      await triggerSync();
    } catch (error) {
      console.error('Failed to retry items:', error);
      throw error;
    }
  }, [triggerSync]);

  return {
    syncStatus,
    uploadRecordingChunk,
    finalizeRecording,
    triggerSync,
    manualSync,
    clearOfflineData,
    retryFailedItems,
  };
}
