import { create } from 'zustand'
import { ipc } from '../utils/ipc.js'

const useBookStore = create((set) => ({
  books: [],
  isLoading: false,
  error: null,
  loadBooks: async () => {
    set({ isLoading: true, error: null })
    const result = await ipc.booksGetAll()
    if (result.success) {
      set({ books: result.data || [], isLoading: false })
    } else {
      set({ error: result.error, isLoading: false })
    }
  },
  createBook: async (payload) => {
    const result = await ipc.booksCreate(payload)
    if (result.success) {
      set((state) => ({ books: [result.data, ...state.books] }))
    }
    return result
  },
  updateBook: async (id, payload) => {
    const result = await ipc.booksUpdate(id, payload)
    if (result.success) {
      set((state) => ({
        books: state.books.map((book) =>
          book.id === id ? result.data : book
        ),
      }))
    }
    return result
  },
  deleteBook: async (id) => {
    const result = await ipc.booksDelete(id)
    if (result.success) {
      set((state) => ({ books: state.books.filter((book) => book.id !== id) }))
    }
    return result
  },
}))

export default useBookStore
