import { create } from 'zustand'

const readInitialSidebarState = () => {
  if (typeof window === 'undefined') {
    return false
  }

  return window.localStorage.getItem('sidebar_collapsed') === 'true'
}

const useUiStore = create((set) => ({
  isSidebarCollapsed: readInitialSidebarState(),
  toggleSidebar: () =>
    set((state) => {
      const nextValue = !state.isSidebarCollapsed

      if (typeof window !== 'undefined') {
        window.localStorage.setItem('sidebar_collapsed', String(nextValue))
      }

      return { isSidebarCollapsed: nextValue }
    }),
}))

export default useUiStore
