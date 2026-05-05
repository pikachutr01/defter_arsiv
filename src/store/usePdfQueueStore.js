import { create } from 'zustand'

const usePdfQueueStore = create((set) => ({
  items: [],
  addOrUpdateItem: (item) =>
    set((state) => {
      const existingIndex = state.items.findIndex(
        (entry) => entry.pageId === item.pageId && entry.side === item.side
      )

      if (existingIndex === -1) {
        return {
          items: [
            ...state.items,
            {
              ...item,
              note: item.note || '',
              annotatedDataUrl: null,
            },
          ],
        }
      }

      return {
        items: state.items.map((entry, index) =>
          index === existingIndex
            ? {
                ...entry,
                ...item,
                note: item.note ?? entry.note ?? '',
                annotatedDataUrl: entry.annotatedDataUrl ?? null,
              }
            : entry
        ),
      }
    }),
  removeItem: (pageId, side) =>
    set((state) => ({
      items: state.items.filter(
        (entry) => !(entry.pageId === pageId && entry.side === side)
      ),
    })),
  toggleItem: (item) =>
    set((state) => {
      const exists = state.items.some(
        (entry) => entry.pageId === item.pageId && entry.side === item.side
      )

      if (exists) {
        return {
          items: state.items.filter(
            (entry) => !(entry.pageId === item.pageId && entry.side === item.side)
          ),
        }
      }

      return {
        items: [
          ...state.items,
          {
            ...item,
            note: item.note || '',
            annotatedDataUrl: null,
          },
        ],
      }
    }),
  updateItemNote: (pageId, side, note) =>
    set((state) => ({
      items: state.items.map((entry) =>
        entry.pageId === pageId && entry.side === side ? { ...entry, note } : entry
      ),
    })),
  updateItemAnnotation: (pageId, side, annotatedDataUrl) =>
    set((state) => ({
      items: state.items.map((entry) =>
        entry.pageId === pageId && entry.side === side
          ? { ...entry, annotatedDataUrl }
          : entry
      ),
    })),
  reorderItems: (fromIndex, toIndex) =>
    set((state) => {
      const nextItems = [...state.items]
      const [moved] = nextItems.splice(fromIndex, 1)
      nextItems.splice(toIndex, 0, moved)
      return { items: nextItems }
    }),
  clearItems: () => set({ items: [] }),
}))

export default usePdfQueueStore