import { create } from 'zustand'
import { ipc } from '../utils/ipc.js'

const VALID_THEMES = new Set(['light', 'dark'])

const applyTheme = (theme) => {
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.theme = theme
  }
}

const getSystemTheme = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: light)').matches
    ? 'light'
    : 'dark'

const useThemeStore = create((set, get) => ({
  theme: 'dark',
  isReady: false,

  initializeTheme: async () => {
    const result = await ipc.settingsGet('theme_mode')
    const stored = result.success && VALID_THEMES.has(result.data) ? result.data : null
    const nextTheme = stored ?? getSystemTheme()

    applyTheme(nextTheme)
    set({ theme: nextTheme, isReady: true })

    if (!stored) await ipc.settingsSet('theme_mode', nextTheme)
  },

  setTheme: async (theme) => {
    if (!VALID_THEMES.has(theme)) return
    applyTheme(theme)
    set({ theme })
    await ipc.settingsSet('theme_mode', theme)
  },

  toggleTheme: async () => {
    const next = get().theme === 'dark' ? 'light' : 'dark'
    await get().setTheme(next)
  },
}))

export default useThemeStore