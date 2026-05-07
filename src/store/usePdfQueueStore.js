import { create } from 'zustand'

// Yeni queue öğesi için varsayılan değerleri uygular
const applyDefaults = (item, base = {}) => ({
  ...base,
  ...item,
  note: item.note ?? base.note ?? '',
  annotatedDataUrl: base.annotatedDataUrl ?? null,
})

const usePdfQueueStore = create((set) => ({
  items: [],

  // Varsa güncelle, yoksa ekle — tek geçişte çözülüyor
  addOrUpdateItem: (item) =>
    set((state) => {
      let found = false
      const nextItems = state.items.map((entry) => {
        if (entry.pageId !== item.pageId) return entry
        found = true
        return applyDefaults(item, entry)
      })
      return { items: found ? nextItems : [...state.items, applyDefaults(item)] }
    }),

  removeItem: (pageId) =>
    set((state) => ({ items: state.items.filter((e) => e.pageId !== pageId) })),

  // Varsa çıkar, yoksa ekle
  toggleItem: (item) =>
    set((state) => {
      const exists = state.items.some((e) => e.pageId === item.pageId)
      return {
        items: exists
          ? state.items.filter((e) => e.pageId !== item.pageId)
          : [...state.items, applyDefaults(item)],
      }
    }),

  updateItemNote: (pageId, note) =>
    set((state) => ({
      items: state.items.map((e) => (e.pageId === pageId ? { ...e, note } : e)),
    })),

  updateItemAnnotation: (pageId, annotatedDataUrl) =>
    set((state) => ({
      items: state.items.map((e) =>
        e.pageId === pageId ? { ...e, annotatedDataUrl } : e
      ),
    })),

  reorderItems: (fromIndex, toIndex) =>
    set((state) => {
      const nextItems = [...state.items]
      nextItems.splice(toIndex, 0, nextItems.splice(fromIndex, 1)[0])
      return { items: nextItems }
    }),

  clearItems: () => set({ items: [] }),
}))

export default usePdfQueueStore