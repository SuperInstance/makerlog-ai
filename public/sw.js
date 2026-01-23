/**
 * Service Worker for Makerlog.ai
 *
 * Enables PWA functionality with offline support,
 * background sync, and resource caching.
 */

const CACHE_NAME = 'makerlog-v2';
const CACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

// Offline fallback pages
const OFFLINE_FALLBACK = '/offline.html';

// API routes that should be cached
const CACHEABLE_API_PATTERNS = [
  /\/api\/conversations$/,
  /\/api\/opportunities$/,
  /\/api\/quota$/,
  /\/api\/achievements$/,
];

// ============ INSTALL EVENT ============

self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching app shell');
      return cache.addAll(CACHE_URLS);
    })
  );

  // Force activation
  self.skipWaiting();
});

// ============ ACTIVATE EVENT ============

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all([
        // Delete old caches
        ...cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          }),

        // Take control of all pages
        clients.claim(),
      ]);
    })
  );
});

// ============ FETCH EVENT ============

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    // For POST/PUT/DELETE, add to sync queue if offline
    if (!navigator.onLine && shouldSync(request)) {
      event.respondWith(handleOfflineRequest(request));
    }
    return;
  }

  // Skip chrome extensions and other protocols
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // API requests: network-first with cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Asset requests: cache-first with network fallback
  event.respondWith(handleAssetRequest(request));
});

/**
 * Handle API requests with network-first strategy
 */
async function handleApiRequest(request) {
  const url = new URL(request.url);

  try {
    // Try network first
    const response = await fetch(request);

    // Cache successful GET responses for cacheable endpoints
    if (response.ok && isCacheableApiEndpoint(url.pathname)) {
      const clone = response.clone();
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, clone);
    }

    return response;
  } catch (error) {
    console.log('[SW] Network failed, trying cache for:', request.url);

    // Network failed, try cache
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
      // Return cached response with offline indicator
      return new Response(cachedResponse.body, {
        status: 200,
        statusText: 'OK (Cached)',
        headers: {
          ...cachedResponse.headers,
          'X-Offline-Cache': 'true',
        },
      });
    }

    // No cache available, return offline response
    return new Response(
      JSON.stringify({
        error: 'Offline',
        message: 'No cached data available for this request',
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * Handle asset requests with cache-first strategy
 */
async function handleAssetRequest(request) {
  // Try cache first
  const cachedResponse = await caches.match(request);

  if (cachedResponse) {
    // Update cache in background
    fetch(request).then((response) => {
      if (response.ok) {
        const cache = caches.open(CACHE_NAME);
        cache.then((c) => c.put(request, response));
      }
    });

    return cachedResponse;
  }

  // No cache, fetch from network
  try {
    const response = await fetch(request);

    // Cache successful responses
    if (response.ok) {
      const clone = response.clone();
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, clone);
    }

    return response;
  } catch (error) {
    // Network failed and no cache
    if (request.destination === 'document') {
      // Return offline page for navigation requests
      return caches.match(OFFLINE_FALLBACK) || new Response('Offline', { status: 503 });
    }

    throw error;
  }
}

/**
 * Handle offline requests (POST/PUT/DELETE when offline)
 */
async function handleOfflineRequest(request) {
  // Clone the request to read body
  const requestData = {
    url: request.url,
    method: request.method,
    headers: Object.fromEntries(request.headers.entries()),
    body: await request.text(),
    timestamp: Date.now(),
  };

  // Store in IndexedDB via postMessage
  const clients = await self.clients.matchAll();
  clients.forEach((client) => {
    client.postMessage({
      type: 'OFFLINE_REQUEST',
      data: requestData,
    });
  });

  return new Response(
    JSON.stringify({
      success: true,
      message: 'Request queued for sync when online',
    }),
    {
      status: 202,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

// ============ BACKGROUND SYNC ============

self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);

  if (event.tag === 'sync-recordings') {
    event.waitUntil(syncRecordings());
  } else if (event.tag === 'sync-messages') {
    event.waitUntil(syncMessages());
  } else if (event.tag === 'sync-all') {
    event.waitUntil(syncAll());
  }
});

async function syncRecordings() {
  console.log('[SW] Syncing recordings...');

  try {
    // Notify clients to trigger sync
    const clients = await self.clients.matchAll();
    clients.forEach((client) => {
      client.postMessage({
        type: 'SYNC_RECORDINGS',
      });
    });

    return true;
  } catch (error) {
    console.error('[SW] Recording sync failed:', error);
    return false;
  }
}

async function syncMessages() {
  console.log('[SW] Syncing messages...');

  try {
    const clients = await self.clients.matchAll();
    clients.forEach((client) => {
      client.postMessage({
        type: 'SYNC_MESSAGES',
      });
    });

    return true;
  } catch (error) {
  console.error('[SW] Message sync failed:', error);
    return false;
  }
}

async function syncAll() {
  console.log('[SW] Syncing all data...');

  try {
    await syncRecordings();
    await syncMessages();

    return true;
  } catch (error) {
    console.error('[SW] Full sync failed:', error);
    return false;
  }
}

// ============ MESSAGE EVENT ============

self.addEventListener('message', (event) => {
  const { type, data } = event.data;

  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;

    case 'CLEAR_CACHE':
      clearCache();
      break;

    case 'TRIGGER_SYNC':
      triggerBackgroundSync(data?.tag || 'sync-all');
      break;

    case 'GET_STATS':
      getCacheStats().then((stats) => {
        event.ports[0].postMessage({ type: 'CACHE_STATS', data: stats });
      });
      break;
  }
});

/**
 * Clear all caches
 */
async function clearCache() {
  try {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((name) => caches.delete(name)));

    const clients = await self.clients.matchAll();
    clients.forEach((client) => {
      client.postMessage({
        type: 'CACHE_CLEARED',
      });
    });
  } catch (error) {
    console.error('[SW] Failed to clear cache:', error);
  }
}

/**
 * Trigger background sync registration
 */
async function triggerBackgroundSync(tag) {
  if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
    try {
      const registration = await self.registration;
      await registration.sync.register(tag);
      console.log('[SW] Background sync registered:', tag);
    } catch (error) {
      console.error('[SW] Failed to register sync:', error);
    }
  }
}

/**
 * Get cache statistics
 */
async function getCacheStats() {
  try {
    const cache = await caches.open(CACHE_NAME);
    const keys = await cache.keys();

    let totalSize = 0;
    const entries = [];

    for (const request of keys) {
      const response = await cache.match(request);
      if (response) {
        const blob = await response.blob();
        totalSize += blob.size;
        entries.push({
          url: request.url,
          size: blob.size,
        });
      }
    }

    return {
      entryCount: keys.length,
      totalSize,
      entries,
    };
  } catch (error) {
    console.error('[SW] Failed to get cache stats:', error);
    return { entryCount: 0, totalSize: 0, entries: [] };
  }
}

// ============ UTILITY FUNCTIONS ============

/**
 * Check if request should be synced
 */
function shouldSync(request) {
  const url = new URL(request.url);

  // Sync API requests
  if (url.pathname.startsWith('/api/')) {
    return true;
  }

  return false;
}

/**
 * Check if API endpoint should be cached
 */
function isCacheableApiEndpoint(pathname) {
  return CACHEABLE_API_PATTERNS.some((pattern) => pattern.test(pathname));
}

/**
 * Periodic cache cleanup (run daily)
 */
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'cleanup-cache') {
    event.waitUntil(cleanupOldCacheEntries());
  }
});

async function cleanupOldCacheEntries() {
  try {
    const cache = await caches.open(CACHE_NAME);
    const keys = await cache.keys();
    const now = Date.now();
    const MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

    for (const request of keys) {
      const response = await cache.match(request);
      if (response) {
        const cacheTime = response.headers.get('Date');
        if (cacheTime) {
          const age = now - new Date(cacheTime).getTime();
          if (age > MAX_AGE) {
            await cache.delete(request);
            console.log('[SW] Removed old cache entry:', request.url);
          }
        }
      }
    }
  } catch (error) {
    console.error('[SW] Cache cleanup failed:', error);
  }
}

console.log('[SW] Service worker loaded');
