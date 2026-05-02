/**
 * UI state store — modals, sidebar, loading overlays.
 * Not persisted (resets on page reload).
 */
import { create } from "zustand";

interface UIState {
  // Mobile nav
  mobileNavOpen: boolean;
  toggleMobileNav: () => void;
  closeMobileNav: () => void;

  // Search overlay
  searchOpen: boolean;
  openSearch: () => void;
  closeSearch: () => void;

  // Global loading overlay (e.g. during payment redirect)
  globalLoading: boolean;
  setGlobalLoading: (loading: boolean) => void;
}

export const useUIStore = create<UIState>()((set) => ({
  mobileNavOpen: false,
  toggleMobileNav: () => set((s) => ({ mobileNavOpen: !s.mobileNavOpen })),
  closeMobileNav: () => set({ mobileNavOpen: false }),

  searchOpen: false,
  openSearch: () => set({ searchOpen: true }),
  closeSearch: () => set({ searchOpen: false }),

  globalLoading: false,
  setGlobalLoading: (loading) => set({ globalLoading: loading }),
}));
