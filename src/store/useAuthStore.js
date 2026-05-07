import { create } from 'zustand'
import { ipc } from '../utils/ipc.js'

const FALLBACK_ERROR = 'Electron API bulunamadı. Uygulamayı Electron penceresinde açın.'

const useAuthStore = create((set) => ({
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (username, password) => {
    set({ isLoading: true, error: null })
    try {
      const result = await ipc.authLogin({ username, password })
      set(result.success
        ? { isAuthenticated: true, isLoading: false }
        : { error: result.error, isLoading: false }
      )
      return result
    } catch (error) {
      const message = error?.message || FALLBACK_ERROR
      set({ error: message, isLoading: false })
      return { success: false, error: message }
    }
  },

  logout: () => set({ isAuthenticated: false }),
}))

export default useAuthStore