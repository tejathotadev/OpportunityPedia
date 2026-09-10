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
