import { create } from 'zustand'
import { ipc } from '../utils/ipc.js'

const usePageStore = create((set) => ({
  pages: [],
  isLoading: false,
  error: null,

  loadPagesByBook: async (bookId) => {
    set({ isLoading: true, error: null })
    try {
      const result = await ipc.pagesGetByBook(bookId)
      if (result.success) {
        set({ pages: result.data ?? [], isLoading: false })
      } else {
        set({ error: result.error, isLoading: false })
      }
    } catch (error) {
      set({ error: error.message, isLoading: false })
    }
  },

  bulkCreate: async (bookId, count) => {
    try {
      const result = await ipc.pagesBulkCreate(bookId, count)
      if (result.success) set({ pages: result.data ?? [] })
      return result
    } catch (error) {
      return { success: false, error: error.message }
    }
  },

  updatePage: async (id, payload) => {
    try {
      const result = await ipc.pagesUpdate(id, payload)
      if (result.success) {
        set((state) => ({
          pages: state.pages.map((page) => (page.id === id ? result.data : page)),
        }))
      }
      return result
    } catch (error) {
      return { success: false, error: error.message }
    }
  },
}))

export default usePageStore