import { create } from 'zustand'
import { ipc } from '../utils/ipc.js'

const useSettingsStore = create((set) => ({
  storagePath: '',
  isLoading: false,
  error: null,

  fetchStoragePath: async () => {
    set({ isLoading: true, error: null })
    try {
      const result = await ipc.settingsGetStoragePath()
      if (result.success) {
        set({ storagePath: result.data ?? '', isLoading: false })
      } else {
        set({ error: result.error, isLoading: false })
      }
    } catch (error) {
      set({ error: error.message, isLoading: false })
    }
  },

  setStoragePath: async (value) => {
    try {
      const result = await ipc.settingsSetStoragePath(value)
      if (result.success) set({ storagePath: result.data ?? value })
      return result
    } catch (error) {
      return { success: false, error: error.message }
    }
  },

  chooseStoragePath: async () => {
    try {
      const result = await ipc.settingsChooseStoragePath()
      if (result.success) set({ storagePath: result.data ?? '' })
      return result
    } catch (error) {
      return { success: false, error: error.message }
    }
  },
}))

export default useSettingsStore