/**
 * Service Worker Registration
 *
 * Registers and manages the service worker for PWA functionality.
 * Handles updates, communication, and lifecycle events.
 */

const SW_VERSION = '2.0.0';
const SW_URL = `/sw.js?v=${SW_VERSION}`;

export interface ServiceWorkerStatus {
  supported: boolean;
  registered: boolean;
  activated: boolean;
  updating: boolean;
  waiting: boolean;
  controller: boolean;
}

export type ServiceWorkerMessageHandler = (data: any) => void;

class ServiceWorkerManager {
  private registration: ServiceWorkerRegistration | null = null;
  private messageHandlers: Set<ServiceWorkerMessageHandler> = new Set();
  private updateListener: ((waiting: ServiceWorkerRegistration) => void) | null = null;

  /**
   * Check if service workers are supported
   */
  isSupported(): boolean {
    return 'serviceWorker' in navigator;
  }

  /**
   * Register the service worker
   */
  async register(): Promise<ServiceWorkerRegistration | null> {
    if (!this.isSupported()) {
      console.warn('[SW] Service workers not supported');
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.register(SW_URL, {
        updateViaCache: 'imports',
      });

      this.registration = registration;

      // Listen for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New version available
              this.notifyUpdateAvailable(registration);
            }
          });
        }
      });

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        this.handleServiceWorkerMessage(event.data);
      });

      // Listen for controller change
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });

      console.log('[SW] Service worker registered successfully');
      return registration;
    } catch (error) {
      console.error('[SW] Failed to register service worker:', error);
      return null;
    }
  }

  /**
   * Get current status
   */
  getStatus(): ServiceWorkerStatus {
    if (!this.isSupported()) {
      return { supported: false, registered: false, activated: false, updating: false, waiting: false, controller: false };
    }

    return {
      supported: true,
      registered: !!this.registration,
      activated: !!this.registration?.active,
      updating: !!this.registration?.installing,
      waiting: !!this.registration?.waiting,
      controller: !!navigator.serviceWorker.controller,
    };
  }

  /**
   * Skip waiting and activate new service worker
   */
  async skipWaiting(): Promise<void> {
    if (!this.registration?.waiting) {
      console.warn('[SW] No waiting service worker to skip');
      return;
    }

    this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  }

  /**
   * Clear all caches
   */
  async clearCache(): Promise<void> {
    if (!this.registration?.active) {
      console.warn('[SW] No active service worker');
      return;
    }

    this.registration.active.postMessage({ type: 'CLEAR_CACHE' });
  }

  /**
   * Trigger background sync
   */
  async triggerSync(tag: string = 'sync-all'): Promise<void> {
    if (!this.registration?.active) {
      console.warn('[SW] No active service worker');
      return;
    }

    this.registration.active.postMessage({ type: 'TRIGGER_SYNC', data: { tag } });
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{ entryCount: number; totalSize: number; entries: Array<{ url: string; size: number }> } | null> {
    if (!this.registration?.active) {
      console.warn('[SW] No active service worker');
      return null;
    }

    return new Promise((resolve) => {
      const messageChannel = new MessageChannel();

      messageChannel.port1.onmessage = (event) => {
        if (event.data.type === 'CACHE_STATS') {
          resolve(event.data.data);
        } else {
          resolve(null);
        }
      };

      this.registration!.active!.postMessage({ type: 'GET_STATS' }, [messageChannel.port2]);

      // Timeout after 5 seconds
      setTimeout(() => resolve(null), 5000);
    });
  }

  /**
   * Register update listener
   */
  onUpdate(callback: (waiting: ServiceWorkerRegistration) => void): () => void {
    this.updateListener = callback;

    // Check for waiting SW on registration
    if (this.registration?.waiting) {
      callback(this.registration);
    }

    // Return unsubscribe function
    return () => {
      this.updateListener = null;
    };
  }

  /**
   * Add message handler
   */
  onMessage(handler: ServiceWorkerMessageHandler): () => void {
    this.messageHandlers.add(handler);

    // Return unsubscribe function
    return () => {
      this.messageHandlers.delete(handler);
    };
  }

  /**
   * Handle messages from service worker
   */
  private handleServiceWorkerMessage(data: any): void {
    switch (data.type) {
      case 'CACHE_CLEARED':
        console.log('[SW] Cache cleared');
        break;
      case 'SYNC_RECORDINGS':
        console.log('[SW] Recordings sync triggered');
        break;
      case 'SYNC_MESSAGES':
        console.log('[SW] Messages sync triggered');
        break;
      case 'OFFLINE_REQUEST':
        console.log('[SW] Offline request queued:', data.data);
        break;
    }

    // Notify all handlers
    this.messageHandlers.forEach((handler) => handler(data));
  }

  /**
   * Notify about available update
   */
  private notifyUpdateAvailable(registration: ServiceWorkerRegistration): void {
    if (this.updateListener) {
      this.updateListener(registration);
    }
  }

  /**
   * Unregister service worker
   */
  async unregister(): Promise<boolean> {
    if (!this.registration) {
      return true;
    }

    try {
      const result = await this.registration.unregister();
      this.registration = null;
      console.log('[SW] Service worker unregistered');
      return result;
    } catch (error) {
      console.error('[SW] Failed to unregister service worker:', error);
      return false;
    }
  }
}

// Export singleton instance
export const swManager = new ServiceWorkerManager();

// Auto-register on import (in production)
if (import.meta.env.PROD && typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    swManager.register();
  });
}
