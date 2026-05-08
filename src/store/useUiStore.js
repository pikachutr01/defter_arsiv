import { create } from 'zustand'

const SIDEBAR_KEY = 'sidebar_collapsed'
const canUseStorage = typeof window !== 'undefined'

const readInitialSidebarState = () =>
  canUseStorage && window.localStorage.getItem(SIDEBAR_KEY) === 'true'

const useUiStore = create((set) => ({
  isSidebarCollapsed: readInitialSidebarState(),

  toggleSidebar: () =>
    set((state) => {
      const next = !state.isSidebarCollapsed
      if (canUseStorage) window.localStorage.setItem(SIDEBAR_KEY, String(next))
      return { isSidebarCollapsed: next }
    }),

  // TopBar back navigation — BookDetail tarafından set edilir
  // { label: string, action: fn, bookName: string } | null
  headerBackNav: null,
  setHeaderBackNav: (nav) => set({ headerBackNav: nav }),
  clearHeaderBackNav: () => set({ headerBackNav: null }),
}))

export default useUiStore