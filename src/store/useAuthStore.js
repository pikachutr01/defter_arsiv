import { create } from 'zustand'
import { ipc } from '../utils/ipc.js'

const useAuthStore = create((set) => ({
  isAuthenticated: false,
  isLoading: false,
  error: null,
  login: async (username, password) => {
    set({ isLoading: true, error: null })
    try {
      const result = await ipc.authLogin({ username, password })
      if (result.success) {
        set({ isAuthenticated: true, isLoading: false })
      } else {
        set({ error: result.error, isLoading: false })
      }
      return result
    } catch (error) {
      set({
        error:
          error?.message ||
          'Electron API bulunamadı. Uygulamayı Electron penceresinde açın.',
        isLoading: false,
      })
      return { success: false, error: error?.message }
    }
  },
  logout: () => set({ isAuthenticated: false }),
}))

export default useAuthStore
