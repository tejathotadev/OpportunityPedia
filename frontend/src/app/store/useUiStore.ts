import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Client-only chrome state that must survive navigation and reloads.
 * Server data lives in React Query, not here.
 */
interface UiState {
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void

  mobileNavOpen: boolean
  setMobileNavOpen: (open: boolean) => void

  searchOpen: boolean
  setSearchOpen: (open: boolean) => void

  radarRunsOpen: boolean
  setRadarRunsOpen: (open: boolean) => void
  /** When true, Radar runs drawer expands the newest run (e.g. from toast). */
  radarRunsExpandLatest: boolean
  openRadarRuns: (options?: { expandLatest?: boolean }) => void

  supportOpen: boolean
  setSupportOpen: (open: boolean) => void
  openSupport: () => void

  recentSearches: string[]
  addRecentSearch: (term: string) => void
  clearRecentSearches: () => void
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),

      mobileNavOpen: false,
      setMobileNavOpen: (mobileNavOpen) => set({ mobileNavOpen }),

      searchOpen: false,
      setSearchOpen: (searchOpen) => set({ searchOpen }),

      radarRunsOpen: false,
      setRadarRunsOpen: (radarRunsOpen) =>
        set({
          radarRunsOpen,
          ...(radarRunsOpen ? {} : { radarRunsExpandLatest: false }),
        }),
      radarRunsExpandLatest: false,
      openRadarRuns: (options) =>
        set({
          radarRunsOpen: true,
          radarRunsExpandLatest: Boolean(options?.expandLatest),
        }),

      supportOpen: false,
      setSupportOpen: (supportOpen) => set({ supportOpen }),
      openSupport: () => set({ supportOpen: true }),

      recentSearches: [],
      addRecentSearch: (term) =>
        set((state) => {
          const cleaned = term.trim()
          if (!cleaned) return state
          const next = [cleaned, ...state.recentSearches.filter((item) => item !== cleaned)]
          return { recentSearches: next.slice(0, 5) }
        }),
      clearRecentSearches: () => set({ recentSearches: [] }),
    }),
    {
      name: 'opportunity-pedia.ui',
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        recentSearches: state.recentSearches,
      }),
    },
  ),
)
