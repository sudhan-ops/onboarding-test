import { create } from 'zustand';
import { api } from '../services/api';
import type { Task } from '../types';
import { useNotificationStore } from './notificationStore';

interface TaskState {
  tasks: Task[];
  isLoading: boolean;
  error: string | null;
  fetchTasks: () => Promise<void>;
  createTask: (taskData: Omit<Task, 'id' | 'createdAt' | 'status' | 'escalationStatus'>) => Promise<void>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  runAutomaticEscalations: () => Promise<void>;
}

// Fix: Removed generic type argument from create() to avoid untyped function call error.
export const useTaskStore = create<TaskState>((set) => ({
  tasks: [],
  isLoading: false,
  error: null,
  fetchTasks: async () => {
    set({ isLoading: true, error: null });
    try {
      const tasks = await api.getTasks();
      set({ tasks, isLoading: false });
    } catch (err) {
      set({ error: 'Failed to fetch tasks.', isLoading: false });
    }
  },
  createTask: async (taskData) => {
    try {
      const newTask = await api.createTask(taskData);
      set((state) => ({ tasks: [newTask, ...state.tasks] }));
    } catch (err) {
      console.error("Failed to create task", err);
      throw new Error("Failed to create task.");
    }
  },
  updateTask: async (id, updates) => {
    try {
      const updatedTask = await api.updateTask(id, updates);
      set((state) => ({
        tasks: state.tasks.map((task) => (task.id === id ? updatedTask : task)),
      }));
    } catch (err) {
      console.error("Failed to update task", err);
      throw new Error("Failed to update task.");
    }
  },
  deleteTask: async (id) => {
    try {
      await api.deleteTask(id);
      set((state) => ({
        tasks: state.tasks.filter((task) => task.id !== id),
      }));
    } catch (err) {
      console.error("Failed to delete task", err);
      throw new Error("Failed to delete task.");
    }
  },
  runAutomaticEscalations: async () => {
    try {
        const { updatedTasks, newNotifications } = await api.runAutomaticEscalations();
        
        if (updatedTasks.length > 0) {
            set((state) => ({
                tasks: state.tasks.map(task => updatedTasks.find(ut => ut.id === task.id) || task)
            }));
        }

        if (newNotifications.length > 0) {
            const createNotifPromises = newNotifications.map(notif => api.createNotification(notif));
            await Promise.all(createNotifPromises);
            // Trigger a re-fetch in the notification store to show the bell icon update
            useNotificationStore.getState().fetchNotifications();
        }
    } catch (err) {
       console.error("Failed to run automatic escalations", err);
       // We don't throw here as this is a background process
    }
  },
}));