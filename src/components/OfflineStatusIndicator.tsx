/**
 * OfflineStatusIndicator Component
 *
 * Displays online/offline status and pending sync items.
 * Shows sync progress and allows manual sync triggering.
 */

import React from 'react';

interface OfflineStatusIndicatorProps {
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
  onManualSync: () => void;
}

export function OfflineStatusIndicator({
  isOnline,
  isSyncing,
  pendingUploads,
  lastSyncTime,
  syncError,
  syncProgress,
  onManualSync,
}: OfflineStatusIndicatorProps) {
  const formatLastSync = (timestamp: number | null) => {
    if (!timestamp) return 'Never';
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  };

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-slate-800 border-b border-slate-700">
      {/* Online Status */}
      <div className="flex items-center gap-2">
        <div
          className={`w-2 h-2 rounded-full ${
            isOnline ? 'bg-green-500' : 'bg-red-500'
          } ${isOnline ? '' : 'animate-pulse'}`}
        />
        <span className="text-xs text-slate-400">
          {isOnline ? 'Online' : 'Offline'}
        </span>
      </div>

      {/* Pending Uploads */}
      {pendingUploads > 0 && (
        <div className="flex items-center gap-2 px-2 py-1 bg-yellow-500/20 rounded-full">
          <span className="text-yellow-400 text-xs font-medium">
            {pendingUploads} pending
          </span>
        </div>
      )}

      {/* Sync Progress */}
      {isSyncing && syncProgress.total > 0 && (
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-slate-400">
            Syncing {syncProgress.completed}/{syncProgress.total}
          </span>
          {syncProgress.failed > 0 && (
            <span className="text-xs text-red-400">({syncProgress.failed} failed)</span>
          )}
        </div>
      )}

      {/* Sync Error */}
      {syncError && !isSyncing && (
        <div className="flex items-center gap-2 px-2 py-1 bg-red-500/20 rounded-full">
          <span className="text-red-400 text-xs">Sync failed</span>
        </div>
      )}

      {/* Last Sync Time */}
      {lastSyncTime && isOnline && !isSyncing && (
        <span className="text-xs text-slate-500">
          Synced {formatLastSync(lastSyncTime)}
        </span>
      )}

      <div className="flex-1" />

      {/* Manual Sync Button */}
      {(pendingUploads > 0 || syncError) && isOnline && !isSyncing && (
        <button
          onClick={onManualSync}
          className="text-xs bg-blue-500 hover:bg-blue-400 text-white px-3 py-1 rounded transition btn-press focus-ring min-h-[32px]"
          disabled={isSyncing}
        >
          Sync Now
        </button>
      )}

      {/* Syncing Spinner */}
      {isSyncing && (
        <svg className="w-4 h-4 text-blue-500 animate-spin" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
    </div>
  );
}

/**
 * OfflineBanner Component
 *
 * Shows a prominent banner when offline with helpful information.
 */
export function OfflineBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-4 mb-4 fade-in">
      <div className="flex items-start gap-3">
        <span className="text-2xl flex-shrink-0">📶</span>
        <div className="flex-1">
          <p className="text-yellow-400 font-medium text-sm">You're offline</p>
          <p className="text-yellow-300/80 text-xs mt-1">
            Don't worry! Keep recording and your data will sync automatically when you reconnect.
          </p>
        </div>
        <button
          onClick={onDismiss}
          className="text-yellow-400 hover:text-yellow-300 transition-colors"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
