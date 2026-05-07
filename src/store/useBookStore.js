import { create } from 'zustand'
import { ipc } from '../utils/ipc.js'

const useBookStore = create((set) => ({
  books: [],
  isLoading: false,
  error: null,

  loadBooks: async () => {
    set({ isLoading: true, error: null })
    try {
      const result = await ipc.booksGetAll()
      if (result.success) {
        set({ books: result.data ?? [], isLoading: false })
      } else {
        set({ error: result.error, isLoading: false })
      }
    } catch (error) {
      set({ error: error.message, isLoading: false })
    }
  },

  createBook: async (payload) => {
    try {
      const result = await ipc.booksCreate(payload)
      if (result.success) {
        set((state) => ({ books: [result.data, ...state.books] }))
      }
      return result
    } catch (error) {
      return { success: false, error: error.message }
    }
  },

  updateBook: async (id, payload) => {
    try {
      const result = await ipc.booksUpdate(id, payload)
      if (result.success) {
        set((state) => ({
          books: state.books.map((book) => (book.id === id ? result.data : book)),
        }))
      }
      return result
    } catch (error) {
      return { success: false, error: error.message }
    }
  },

  deleteBook: async (id) => {
    try {
      const result = await ipc.booksDelete(id)
      if (result.success) {
        set((state) => ({ books: state.books.filter((book) => book.id !== id) }))
      }
      return result
    } catch (error) {
      return { success: false, error: error.message }
    }
  },
}))

export default useBookStore