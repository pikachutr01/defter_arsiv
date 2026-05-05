import { useState } from 'react'
import Modal from '../shared/Modal.jsx'

export default function PageForm({ onClose, onSubmit }) {
  const [pageNumber, setPageNumber] = useState(1)

  const handleSubmit = (event) => {
    event.preventDefault()
    onSubmit({ page_number: pageNumber })
  }

  return (
    <Modal title="Sayfa Ekle" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="text-xs text-[var(--text-muted)]">
          Sayfa Numarası
          <input
            type="number"
            min="1"
            value={pageNumber}
            onChange={(event) => setPageNumber(Number(event.target.value))}
            className="mt-2 w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm text-[var(--text-primary)]"
          />
        </label>
        <button
          type="submit"
          className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm text-white"
        >
          Kaydet
        </button>
      </form>
    </Modal>
  )
}
