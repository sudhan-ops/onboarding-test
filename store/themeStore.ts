import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

type Theme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  isAutomatic: boolean;
  setTheme: (theme: Theme) => void; // User choice, disables automatic
  setAutomatic: (automatic: boolean) => void;
  // Internal function for ThemeManager to avoid disabling automatic mode
  _setThemeInternal: (theme: Theme) => void;
}

// Fix: Removed generic type argument from create() and persist() to avoid untyped function call error.
export const useThemeStore = create(
  persist<ThemeState>(
    (set) => ({
      theme: 'light', // Default, will be adjusted by ThemeManager
      isAutomatic: true, // Default to automatic theme switching
      setTheme: (theme) => set({ theme, isAutomatic: false }),
      setAutomatic: (automatic) => set({ isAutomatic: automatic }),
      _setThemeInternal: (theme) => set({ theme }),
    }),
    {
      name: 'paradigm-app-theme',
      storage: createJSONStorage(() => localStorage),
    }
  )
);