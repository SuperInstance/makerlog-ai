/**
 * Offline Storage Manager
 *
 * IndexedDB wrapper for storing recordings, messages, conversations,
 * and opportunities when offline. Handles sync queue and conflict resolution.
 */

const DB_NAME = 'makerlog-offline';
const DB_VERSION = 1;

// Database stores
export const STORES = {
  RECORDINGS: 'recordings',
  MESSAGES: 'messages',
  CONVERSATIONS: 'conversations',
  OPPORTUNITIES: 'opportunities',
  SYNC_QUEUE: 'sync_queue',
} as const;

// IndexedDB schema
const SCHEMA = {
  [STORES.RECORDINGS]: { keyPath: 'id', autoIncrement: false },
  [STORES.MESSAGES]: { keyPath: 'id', autoIncrement: false },
  [STORES.CONVERSATIONS]: { keyPath: 'id', autoIncrement: false },
  [STORES.OPPORTUNITIES]: { keyPath: 'id', autoIncrement: false },
  [STORES.SYNC_QUEUE]: { keyPath: 'id', autoIncrement: true },
};

// Types
export interface OfflineRecording {
  id: string;
  blob: Blob;
  timestamp: number;
  conversationId?: string;
  uploaded: boolean;
  uploadAttempts: number;
  lastAttempt?: number;
}

export interface OfflineMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  audioUrl?: string;
  timestamp: number;
  synced: boolean;
}

export interface OfflineConversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  synced: boolean;
}

export interface OfflineOpportunity {
  id: string;
  type: 'image' | 'code' | 'text' | 'audio';
  prompt: string;
  confidence: number;
  status: string;
  synced: boolean;
}

export interface SyncQueueItem {
  id?: number;
  type: 'recording' | 'message' | 'conversation' | 'opportunity';
  action: 'create' | 'update' | 'delete';
  data: any;
  retryCount: number;
  createdAt: number;
  lastAttempt?: number;
  error?: string;
}

class OfflineStorage {
  private db: IDBDatabase | null = null;

  /**
   * Initialize the database
   */
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores
        Object.entries(SCHEMA).forEach(([name, config]) => {
          if (!db.objectStoreNames.contains(name)) {
            const store = db.createObjectStore(name, config);

            // Create indexes for common queries
            if (name === STORES.RECORDINGS) {
              store.createIndex('timestamp', 'timestamp', { unique: false });
              store.createIndex('uploaded', 'uploaded', { unique: false });
            }
            if (name === STORES.MESSAGES) {
              store.createIndex('conversationId', 'conversationId', { unique: false });
              store.createIndex('synced', 'synced', { unique: false });
            }
            if (name === STORES.CONVERSATIONS) {
              store.createIndex('updatedAt', 'updatedAt', { unique: false });
              store.createIndex('synced', 'synced', { unique: false });
            }
            if (name === STORES.SYNC_QUEUE) {
              store.createIndex('type', 'type', { unique: false });
              store.createIndex('createdAt', 'createdAt', { unique: false });
            }
          }
        });
      };
    });
  }

  /**
   * Generic add operation
   */
  private async add(storeName: string, data: any): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.add(data);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Generic put operation (upsert)
   */
  private async put(storeName: string, data: any): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Generic get operation
   */
  private async get(storeName: string, key: string): Promise<any> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Generic getAll operation
   */
  private async getAll(storeName: string): Promise<any[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Generic delete operation
   */
  private async delete(storeName: string, key: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Query with index
   */
  private async queryByIndex(
    storeName: string,
    indexName: string,
    value: any
  ): Promise<any[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(value);

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // ============ RECORDINGS ============

  async saveRecording(recording: OfflineRecording): Promise<void> {
    await this.add(STORES.RECORDINGS, recording);
  }

  async getRecording(id: string): Promise<OfflineRecording | null> {
    return await this.get(STORES.RECORDINGS, id);
  }

  async getAllRecordings(): Promise<OfflineRecording[]> {
    return await this.getAll(STORES.RECORDINGS);
  }

  async getPendingRecordings(): Promise<OfflineRecording[]> {
    return await this.queryByIndex(STORES.RECORDINGS, 'uploaded', false);
  }

  async updateRecording(recording: OfflineRecording): Promise<void> {
    await this.put(STORES.RECORDINGS, recording);
  }

  async deleteRecording(id: string): Promise<void> {
    await this.delete(STORES.RECORDINGS, id);
  }

  // ============ MESSAGES ============

  async saveMessage(message: OfflineMessage): Promise<void> {
    await this.add(STORES.MESSAGES, message);
  }

  async getMessage(id: string): Promise<OfflineMessage | null> {
    return await this.get(STORES.MESSAGES, id);
  }

  async getMessagesByConversation(conversationId: string): Promise<OfflineMessage[]> {
    return await this.queryByIndex(STORES.MESSAGES, 'conversationId', conversationId);
  }

  async getUnsyncedMessages(): Promise<OfflineMessage[]> {
    return await this.queryByIndex(STORES.MESSAGES, 'synced', false);
  }

  async updateMessage(message: OfflineMessage): Promise<void> {
    await this.put(STORES.MESSAGES, message);
  }

  async deleteMessage(id: string): Promise<void> {
    await this.delete(STORES.MESSAGES, id);
  }

  // ============ CONVERSATIONS ============

  async saveConversation(conversation: OfflineConversation): Promise<void> {
    await this.add(STORES.CONVERSATIONS, conversation);
  }

  async getConversation(id: string): Promise<OfflineConversation | null> {
    return await this.get(STORES.CONVERSATIONS, id);
  }

  async getAllConversations(): Promise<OfflineConversation[]> {
    return await this.getAll(STORES.CONVERSATIONS);
  }

  async getUnsyncedConversations(): Promise<OfflineConversation[]> {
    return await this.queryByIndex(STORES.CONVERSATIONS, 'synced', false);
  }

  async updateConversation(conversation: OfflineConversation): Promise<void> {
    await this.put(STORES.CONVERSATIONS, conversation);
  }

  async deleteConversation(id: string): Promise<void> {
    await this.delete(STORES.CONVERSATIONS, id);
  }

  // ============ OPPORTUNITIES ============

  async saveOpportunity(opportunity: OfflineOpportunity): Promise<void> {
    await this.add(STORES.OPPORTUNITIES, opportunity);
  }

  async getOpportunity(id: string): Promise<OfflineOpportunity | null> {
    return await this.get(STORES.OPPORTUNITIES, id);
  }

  async getAllOpportunities(): Promise<OfflineOpportunity[]> {
    return await this.getAll(STORES.OPPORTUNITIES);
  }

  async getUnsyncedOpportunities(): Promise<OfflineOpportunity[]> {
    return await this.queryByIndex(STORES.OPPORTUNITIES, 'synced', false);
  }

  async updateOpportunity(opportunity: OfflineOpportunity): Promise<void> {
    await this.put(STORES.OPPORTUNITIES, opportunity);
  }

  async deleteOpportunity(id: string): Promise<void> {
    await this.delete(STORES.OPPORTUNITIES, id);
  }

  // ============ SYNC QUEUE ============

  async addToQueue(item: Omit<SyncQueueItem, 'id' | 'retryCount' | 'createdAt'>): Promise<number> {
    const queueItem: SyncQueueItem = {
      ...item,
      retryCount: 0,
      createdAt: Date.now(),
    };
    await this.add(STORES.SYNC_QUEUE, queueItem);
    return queueItem.id as number;
  }

  async getQueueItems(type?: string, limit = 10): Promise<SyncQueueItem[]> {
    let items = await this.getAll(STORES.SYNC_QUEUE);

    // Filter by type if specified
    if (type) {
      items = items.filter((item) => item.type === type);
    }

    // Sort by creation date (oldest first)
    items.sort((a, b) => a.createdAt - b.createdAt);

    // Limit results
    return items.slice(0, limit);
  }

  async updateQueueItem(item: SyncQueueItem): Promise<void> {
    await this.put(STORES.SYNC_QUEUE, item);
  }

  async removeQueueItem(id: number): Promise<void> {
    await this.delete(STORES.SYNC_QUEUE, id.toString());
  }

  async clearQueue(): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORES.SYNC_QUEUE, 'readwrite');
      const store = transaction.objectStore(STORES.SYNC_QUEUE);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // ============ UTILITY METHODS ============

  /**
   * Get storage size in bytes
   */
  async getStorageSize(): Promise<number> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      let totalSize = 0;

      const transaction = this.db!.transaction(
        [STORES.RECORDINGS, STORES.MESSAGES, STORES.CONVERSATIONS, STORES.OPPORTUNITIES, STORES.SYNC_QUEUE],
        'readonly'
      );

      transaction.oncomplete = () => resolve(totalSize);
      transaction.onerror = () => reject(transaction.error);

      // Calculate size for each store
      [STORES.RECORDINGS, STORES.MESSAGES, STORES.CONVERSATIONS, STORES.OPPORTUNITIES, STORES.SYNC_QUEUE].forEach(
        (storeName) => {
          const store = transaction.objectStore(storeName);
          const request = store.openCursor();
          request.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest).result;
            if (cursor) {
              totalSize += JSON.stringify(cursor.value).length;
              cursor.continue();
            }
          };
        }
      );
    });
  }

  /**
   * Clear all data (for logout/debugging)
   */
  async clearAll(): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        [STORES.RECORDINGS, STORES.MESSAGES, STORES.CONVERSATIONS, STORES.OPPORTUNITIES, STORES.SYNC_QUEUE],
        'readwrite'
      );

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);

      [STORES.RECORDINGS, STORES.MESSAGES, STORES.CONVERSATIONS, STORES.OPPORTUNITIES, STORES.SYNC_QUEUE].forEach(
        (storeName) => {
          transaction.objectStore(storeName).clear();
        }
      );
    });
  }

  /**
   * Get statistics about offline data
   */
  async getStats(): Promise<{
    recordings: number;
    pendingRecordings: number;
    messages: number;
    unsyncedMessages: number;
    conversations: number;
    unsyncedConversations: number;
    opportunities: number;
    unsyncedOpportunities: number;
    queueItems: number;
    storageSize: number;
  }> {
    const [recordings, pendingRecordings, messages, unsyncedMessages, conversations, unsyncedConversations, opportunities, unsyncedOpportunities, queueItems, storageSize] =
      await Promise.all([
        this.getAllRecordings(),
        this.getPendingRecordings(),
        this.getAll(STORES.MESSAGES),
        this.getUnsyncedMessages(),
        this.getAll(STORES.CONVERSATIONS),
        this.getUnsyncedConversations(),
        this.getAll(STORES.OPPORTUNITIES),
        this.getUnsyncedOpportunities(),
        this.getQueueItems(),
        this.getStorageSize(),
      ]);

    return {
      recordings: recordings.length,
      pendingRecordings: pendingRecordings.length,
      messages: messages.length,
      unsyncedMessages: unsyncedMessages.length,
      conversations: conversations.length,
      unsyncedConversations: unsyncedConversations.length,
      opportunities: opportunities.length,
      unsyncedOpportunities: unsyncedOpportunities.length,
      queueItems: queueItems.length,
      storageSize,
    };
  }
}

// Export singleton instance
export const offlineStorage = new OfflineStorage();
