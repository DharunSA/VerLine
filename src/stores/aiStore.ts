import { create } from 'zustand';
import type { NLExtractionResult, NarratorResult } from '../lib/ai';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface AIStore {
  // Natural language add
  nlLoading: boolean;
  nlError: string | null;
  nlResult: NLExtractionResult | null;

  // Narrator
  narratorCache: Record<string, NarratorResult>; // key = `${fromId}-${toId}`
  narratorLoading: boolean;

  // Story
  storyLoading: boolean;
  storyError: string | null;

  // Actions
  setNLLoading: (v: boolean) => void;
  setNLError: (e: string | null) => void;
  setNLResult: (r: NLExtractionResult | null) => void;
  clearNLResult: () => void;
  setNarratorResult: (key: string, r: NarratorResult) => void;
  setNarratorLoading: (v: boolean) => void;
  setStoryLoading: (v: boolean) => void;
  setStoryError: (e: string | null) => void;
}

export const useAIStore = create<AIStore>((set) => ({
  nlLoading: false,
  nlError: null,
  nlResult: null,
  narratorCache: {},
  narratorLoading: false,
  storyLoading: false,
  storyError: null,

  setNLLoading: (v) => set({ nlLoading: v }),
  setNLError: (e) => set({ nlError: e }),
  setNLResult: (r) => set({ nlResult: r }),
  clearNLResult: () => set({ nlResult: null }),
  setNarratorResult: (key, r) =>
    set(s => ({ narratorCache: { ...s.narratorCache, [key]: r } })),
  setNarratorLoading: (v) => set({ narratorLoading: v }),
  setStoryLoading: (v) => set({ storyLoading: v }),
  setStoryError: (e) => set({ storyError: e }),
}));
