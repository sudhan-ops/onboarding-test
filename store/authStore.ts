

import { create } from 'zustand';
import { authService } from '../services/authService';
import type { User } from '../types';
import { supabase } from '../services/supabase';
import type { RealtimeChannel, AuthSubscription } from '@supabase/supabase-js';
// FIX: Import the 'api' object to resolve 'Cannot find name' errors.
import { api } from '../services/api';

// Centralized friendly error message handler for Supabase
const getFriendlyAuthError = (errorMessage: string): string => {
    if (errorMessage.includes('Invalid API key')) {
        return 'Connection to the backend failed: The API key is invalid. Please contact the administrator to correct the configuration.';
    }
    if (errorMessage.toLowerCase().includes('failed to fetch')) {
        return 'Network error: Could not connect to Supabase. This is often a CORS issue. Please go to your Supabase project\'s "Authentication" > "URL Configuration" settings and add your app\'s URL to the "Redirect URLs" list. For local development, this is typically http://localhost:5173 or similar.';
    }
    if (errorMessage.includes('Invalid login credentials')) {
        return 'Invalid email or password. Please try again.';
    }
    if (errorMessage.includes('User already registered')) {
        return 'An account with this email address already exists. Please sign in or reset your password.';
    }
    if (errorMessage.includes('Email not confirmed')) {
        return 'Please confirm your email address before logging in.';
    }
     if (errorMessage.includes('too many requests')) {
        return 'Too many attempts. Please try again later or reset your password.';
    }
    console.error("Unhandled Supabase auth error:", errorMessage);
    return 'An unexpected error occurred. Please try again or contact support.';
};

interface AuthState {
  user: User | null;
  isCheckedIn: boolean;
  isAttendanceLoading: boolean;
  lastCheckInTime: string | null;
  lastCheckOutTime: string | null;
  loginWithEmail: (email: string, password: string) => Promise<{ error: { message: string } | null }>;
  signUp: (name: string, email: string, password: string) => Promise<{ error: { message: string } | null }>;
  loginWithGoogle: () => Promise<{ error: { message: string } | null; }>;
  sendPasswordReset: (email: string) => Promise<{ error: { message: string } | null }>;
  logout: () => Promise<void>;
  isInitialized: boolean;
  setUser: (user: User | null) => void;
  setInitialized: (initialized: boolean) => void;
  resetAttendance: () => void;
  updateUserProfile: (updates: Partial<User>) => void;
  checkAttendanceStatus: () => Promise<void>;
  toggleCheckInStatus: () => Promise<{ success: boolean; message: string }>;
  error: string | null;
  setError: (error: string | null) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
    (set, get) => ({
      user: null,
      isInitialized: false,
      isCheckedIn: false,
      isAttendanceLoading: true,
      lastCheckInTime: null,
      lastCheckOutTime: null,
      error: null,
      loading: false,
      
      setUser: (user) => set({ user, error: null, loading: false }),
      setInitialized: (initialized) => set({ isInitialized: initialized }),
      setLoading: (loading) => set({ loading }),
      resetAttendance: () => set({
        isCheckedIn: false,
        isAttendanceLoading: false,
        lastCheckInTime: null,
        lastCheckOutTime: null,
      }),
      setError: (error) => set({ error }),

      loginWithEmail: async (email, password) => {
        set({ error: null, loading: true });
        const { data, error } = await authService.signInWithPassword(email, password);

        // Handle sign-in errors
        if (error || !data.user) {
          const friendlyError = getFriendlyAuthError(error?.message || 'Invalid login credentials');
          set({ error: friendlyError, loading: false });
          return { error: { message: friendlyError } };
        }

        // If sign-in is successful, we take full control.
        const appUser = await authService.getAppUserProfile(data.user);
        
        if (appUser) {
            // Success case: profile fetched
            set({ user: appUser, error: null, loading: false });
            return { error: null };
        } else {
            // Critical failure: sign-in worked, but profile fetch failed.
            // Sign the user out to prevent an inconsistent state.
            await authService.signOut(); 
            const friendlyError = 'Login successful, but failed to retrieve user profile. Please try again.';
            set({ user: null, error: friendlyError, loading: false });
            return { error: { message: friendlyError } };
        }
      },

      signUp: async (name, email, password) => {
        set({ error: null, loading: true });
        const { error } = await authService.signUpWithPassword({
            email,
            password,
            options: { data: { name } }
        });

        if (error) {
            set({ error: getFriendlyAuthError(error.message), loading: false });
            return { error: { message: error.message } };
        }
        set({ loading: false });
        return { error: null };
      },

      loginWithGoogle: async () => {
        set({ error: null, loading: true });
        const { error } = await authService.signInWithGoogle();
            
        if (error) {
            set({ error: getFriendlyAuthError(error.message), loading: false });
            return { error: { message: error.message } };
        }
        
        // With redirect flow, the user is not returned immediately.
        // The onAuthStateChange listener will handle the session.
        return { error: null };
      },
      
      sendPasswordReset: async (email: string) => {
          const { error } = await authService.resetPasswordForEmail(email);
          if (error) {
              return { error: { message: error.message } };
          }
          return { error: null };
      },

      logout: async () => {
        // The onAuthStateChange listener in App.tsx will call setUser(null).
        await authService.signOut();
      },

      updateUserProfile: (updates) => set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null
      })),

      checkAttendanceStatus: async () => {
        const { user } = get();
        if (!user) {
            set({ isAttendanceLoading: false });
            return;
        }
        set({ isAttendanceLoading: true });
        try {
            const today = new Date();
            const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0).toISOString();
            const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999).toISOString();
            
            const events = await api.getAttendanceEvents(user.id, startOfDay, endOfDay);
            
            if (events.length === 0) {
                set({
                    isCheckedIn: false,
                    lastCheckInTime: null,
                    lastCheckOutTime: null,
                    isAttendanceLoading: false
                });
                return;
            }

            // Sort events chronologically (oldest first) to easily find first/last
            events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

            const firstCheckIn = events.find(e => e.type === 'check-in');
            const lastCheckOut = [...events].reverse().find(e => e.type === 'check-out');
            const lastEvent = events[events.length - 1];

            set({
                isCheckedIn: lastEvent?.type === 'check-in',
                lastCheckInTime: firstCheckIn ? firstCheckIn.timestamp : null,
                lastCheckOutTime: lastCheckOut ? lastCheckOut.timestamp : null,
                isAttendanceLoading: false
            });
        } catch (error) {
            console.error("Failed to check attendance status:", error);
            set({ isAttendanceLoading: false });
        }
      },

      toggleCheckInStatus: async () => {
          const { user, isCheckedIn } = get();
          if (!user) return { success: false, message: 'User not found' };
          
          const newType = isCheckedIn ? 'check-out' : 'check-in';

          return new Promise((resolve) => {
              navigator.geolocation.getCurrentPosition(
                  async (position) => {
                      const { latitude, longitude } = position.coords;
                      try {
                          await api.addAttendanceEvent({
                              userId: user.id,
                              timestamp: new Date().toISOString(),
                              type: newType,
                              latitude,
                              longitude
                          });
                          await get().checkAttendanceStatus();
                          resolve({ success: true, message: `Successfully ${newType.replace('-', ' ')}!` });
                      } catch (err) {
                          resolve({ success: false, message: 'Failed to update attendance.' });
                      }
                  },
                  async (error) => {
                      console.warn(`Geolocation error: ${error.message}`);
                      // Proceed without location
                       try {
                          await api.addAttendanceEvent({
                              userId: user.id,
                              timestamp: new Date().toISOString(),
                              type: newType,
                          });
                          await get().checkAttendanceStatus();
                          resolve({ success: true, message: `Successfully ${newType.replace('-', ' ')}! (Location not captured)` });
                      } catch (err) {
                          resolve({ success: false, message: 'Failed to update attendance.' });
                      }
                  },
                  { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
              );
          });
      },
    })
);