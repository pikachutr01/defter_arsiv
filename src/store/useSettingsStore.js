import { create } from 'zustand'
import { ipc } from '../utils/ipc.js'

const useSettingsStore = create((set) => ({
  storagePath: '',
  isLoading: false,
  error: null,
  fetchStoragePath: async () => {
    set({ isLoading: true, error: null })
    const result = await ipc.settingsGetStoragePath()
    if (result.success) {
      set({ storagePath: result.data || '', isLoading: false })
    } else {
      set({ error: result.error, isLoading: false })
    }
  },
  setStoragePath: async (value) => {
    const result = await ipc.settingsSetStoragePath(value)
    if (result.success) {
      set({ storagePath: result.data || value })
    }
    return result
  },
  chooseStoragePath: async () => {
    const result = await ipc.settingsChooseStoragePath()
    if (result.success) {
      set({ storagePath: result.data || '' })
    }
    return result
  },
}))

export default useSettingsStore
