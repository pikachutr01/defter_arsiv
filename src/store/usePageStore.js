import { create } from 'zustand'
import { ipc } from '../utils/ipc.js'

const usePageStore = create((set) => ({
  pages: [],
  isLoading: false,
  error: null,
  loadPagesByBook: async (bookId) => {
    set({ isLoading: true, error: null })
    const result = await ipc.pagesGetByBook(bookId)
    if (result.success) {
      set({ pages: result.data || [], isLoading: false })
    } else {
      set({ error: result.error, isLoading: false })
    }
  },
  bulkCreate: async (bookId, count) => {
    const result = await ipc.pagesBulkCreate(bookId, count)
    if (result.success) {
      set({ pages: result.data || [] })
    }
    return result
  },
  updatePage: async (id, payload) => {
    const result = await ipc.pagesUpdate(id, payload)
    if (result.success) {
      set((state) => ({
        pages: state.pages.map((page) =>
          page.id === id ? result.data : page
        ),
      }))
    }
    return result
  },
}))

export default usePageStore
