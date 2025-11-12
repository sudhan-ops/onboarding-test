
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const defaultAuthBackgrounds: string[] = [
  'https://picsum.photos/seed/corporate_campus/1200/900',
  'https://picsum.photos/seed/luxury_complex/1200/900',
  'https://picsum.photos/seed/office_interior/1200/900',
  'https://picsum.photos/seed/landscaping/1200/900',
  'https://picsum.photos/seed/lobby_design/1200/900'
];

interface AuthLayoutState {
  backgroundImages: string[];
  addBackgroundImage: (imageBase64: string) => boolean; // Returns true on success, false on duplicate
  removeBackgroundImage: (index: number) => void;
}

export const useAuthLayoutStore = create(
  persist<AuthLayoutState>(
    (set, get) => ({
      backgroundImages: defaultAuthBackgrounds,
      addBackgroundImage: (imageBase64) => {
        const state = get();
        if (state.backgroundImages.includes(imageBase64)) {
            return false; // It's a duplicate
        }
        set({ backgroundImages: [...state.backgroundImages, imageBase64] });
        return true; // It was added
      },
      removeBackgroundImage: (index) =>
        set((state) => ({
          backgroundImages: state.backgroundImages.filter((_, i) => i !== index),
        })),
    }),
    {
      name: 'paradigm-auth-layout-settings',
      storage: createJSONStorage(() => localStorage),
    }
  )
);