import { useState } from 'react'
import Modal from '../shared/Modal.jsx'

const initialState = {
  name: '',
  description: '',
  book_notes: '',
  total_pages: 0,
}

export default function BookForm({ onClose, onSubmit }) {
  const [formState, setFormState] = useState(initialState)

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormState((prev) => ({
      ...prev,
      [name]: name === 'total_pages' ? Number(value) : value,
    }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    onSubmit(formState)
  }

  return (
    <Modal title="Yeni Cilt" onClose={onClose}>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <label className="text-xs text-[var(--text-muted)]">
          Cilt Adı
          <input
            name="name"
            value={formState.name}
            onChange={handleChange}
            className="mt-2 w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm text-[var(--text-primary)]"
            required
          />
        </label>
        <label className="text-xs text-[var(--text-muted)]">
          Açıklama
          <textarea
            name="description"
            value={formState.description}
            onChange={handleChange}
            rows={3}
            className="mt-2 w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm text-[var(--text-primary)]"
          />
        </label>
        <label className="text-xs text-[var(--text-muted)]">
          Cilt Notu
          <textarea
            name="book_notes"
            value={formState.book_notes}
            onChange={handleChange}
            rows={3}
            className="mt-2 w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm text-[var(--text-primary)]"
          />
        </label>
        <label className="text-xs text-[var(--text-muted)]">
          Toplam Sayfa
          <input
            name="total_pages"
            type="number"
            min="0"
            value={formState.total_pages}
            onChange={handleChange}
            className="mt-2 w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm text-[var(--text-primary)]"
          />
        </label>
        <button
          type="submit"
          className="mt-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm text-white transition hover:bg-[var(--accent-hover)]"
        >
          Kaydet
        </button>
      </form>
    </Modal>
  )
}
