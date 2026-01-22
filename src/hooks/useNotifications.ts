/**
 * useNotifications Hook
 *
 * Provides notification functionality for achievement unlocks,
 * harvest completions, and other important events.
 */

import { useState, useEffect } from 'react';

export interface Notification {
  id: string;
  type: 'achievement' | 'harvest' | 'level_up' | 'streak' | 'error';
  title: string;
  message: string;
  icon: string;
  timestamp: number;
  read: boolean;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if ('Notification' in window) {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    }
    return false;
  };

  const showBrowserNotification = (notification: Notification) => {
    if (permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/icon-192.png',
        badge: '/badge-72.png',
        tag: notification.id,
      });
    }
  };

  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      read: false,
    };

    setNotifications((prev) => [newNotification, ...prev].slice(0, 10)); // Keep last 10
    showBrowserNotification(newNotification);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      markAsRead(newNotification.id);
    }, 5000);
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const clearNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  // Convenience methods for common notification types
  const notifyAchievement = (name: string, xp: number) => {
    addNotification({
      type: 'achievement',
      title: '🏆 Achievement Unlocked!',
      message: `You earned "${name}" (+${xp} XP)`,
      icon: '🏆',
    });
  };

  const notifyLevelUp = (level: number) => {
    addNotification({
      type: 'level_up',
      title: '⬆️ Level Up!',
      message: `You reached Level ${level}!`,
      icon: '⬆️',
    });
  };

  const notifyHarvest = (tasksExecuted: number) => {
    addNotification({
      type: 'harvest',
      title: '🌾 Harvest Complete!',
      message: `${tasksExecuted} task${tasksExecuted > 1 ? 's' : ''} executed overnight`,
      icon: '🌾',
    });
  };

  const notifyStreak = (days: number) => {
    addNotification({
      type: 'streak',
      title: '🔥 Streak Milestone!',
      message: `${days} day streak! Keep it going!`,
      icon: '🔥',
    });
  };

  const notifyError = (message: string) => {
    addNotification({
      type: 'error',
      title: '❌ Something went wrong',
      message,
      icon: '❌',
    });
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    notifications,
    unreadCount,
    permission,
    requestPermission,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAll,
    notifyAchievement,
    notifyLevelUp,
    notifyHarvest,
    notifyStreak,
    notifyError,
  };
}
