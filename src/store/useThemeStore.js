import { create } from 'zustand'
import { ipc } from '../utils/ipc.js'

const applyTheme = (theme) => {
  if (typeof document === 'undefined') {
    return
  }

  document.documentElement.dataset.theme = theme
}

const getSystemTheme = () => {
  if (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-color-scheme: light)').matches
  ) {
    return 'light'
  }

  return 'dark'
}

const useThemeStore = create((set, get) => ({
  theme: 'dark',
  isReady: false,
  initializeTheme: async () => {
    const result = await ipc.settingsGet('theme_mode')
    const storedTheme =
      result.success && (result.data === 'light' || result.data === 'dark')
        ? result.data
        : null
    const nextTheme = storedTheme || getSystemTheme()

    applyTheme(nextTheme)
    set({ theme: nextTheme, isReady: true })

    if (!storedTheme) {
      await ipc.settingsSet('theme_mode', nextTheme)
    }
  },
  setTheme: async (theme) => {
    if (theme !== 'light' && theme !== 'dark') {
      return
    }

    applyTheme(theme)
    set({ theme })
    await ipc.settingsSet('theme_mode', theme)
  },
  toggleTheme: async () => {
    const nextTheme = get().theme === 'dark' ? 'light' : 'dark'
    await get().setTheme(nextTheme)
  },
}))

export default useThemeStore
