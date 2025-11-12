import { create } from 'zustand';
import { api } from '../services/api';
import type { Notification } from '../types';
import { useAuthStore } from './authStore';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  fetchNotifications: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

// Fix: Removed generic type argument from create() to avoid untyped function call error.
export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  error: null,

  fetchNotifications: async () => {
    const user = useAuthStore.getState().user;
    if (!user) return;

    set({ isLoading: true, error: null });
    try {
      const notifications = await api.getNotifications(user.id);
      const unreadCount = notifications.filter(n => !n.isRead).length;
      set({ notifications, unreadCount, isLoading: false });
    } catch (err) {
      set({ error: 'Failed to fetch notifications.', isLoading: false });
    }
  },

  markAsRead: async (notificationId: string) => {
    const existing = get().notifications.find(n => n.id === notificationId);
    if (existing && existing.isRead) return; // Don't do anything if already read

    try {
      await api.markNotificationAsRead(notificationId);
      set((state) => ({
        notifications: state.notifications.map(n =>
          n.id === notificationId ? { ...n, isRead: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    } catch (err) {
      console.error("Failed to mark notification as read", err);
    }
  },

  markAllAsRead: async () => {
    const user = useAuthStore.getState().user;
    if (!user) return;
    
    if (get().unreadCount === 0) return;

    try {
      await api.markAllNotificationsAsRead(user.id);
      set((state) => ({
        notifications: state.notifications.map(n => ({ ...n, isRead: true })),
        unreadCount: 0,
      }));
    } catch (err) {
      console.error("Failed to mark all notifications as read", err);
    }
  },
}));