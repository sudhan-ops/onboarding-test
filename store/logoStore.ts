
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { originalDefaultLogoBase64 } from '../components/ui/logoData';

interface LogoState {
  currentLogo: string;
  defaultLogo: string;
  setCurrentLogo: (logoBase64: string) => void;
  setDefaultLogo: () => void; // Sets current as default
  resetToDefault: () => void; // Sets current to default
  resetToOriginal: () => void; // Resets both to original
}

export const useLogoStore = create(
  persist<LogoState>(
    (set) => ({
      currentLogo: originalDefaultLogoBase64,
      defaultLogo: originalDefaultLogoBase64,
      setCurrentLogo: (logoBase64) => set({ currentLogo: logoBase64 }),
      setDefaultLogo: () => set((state) => ({ defaultLogo: state.currentLogo })),
      resetToDefault: () => set((state) => ({ currentLogo: state.defaultLogo })),
      resetToOriginal: () => set({ 
          currentLogo: originalDefaultLogoBase64, 
          defaultLogo: originalDefaultLogoBase64 
      }),
    }),
    {
      name: 'paradigm-app-logo',
      storage: createJSONStorage(() => localStorage),
    }
  )
);