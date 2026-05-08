import { useCallback, useState } from 'react'
import Modal from '../shared/Modal.jsx'

const buildInitialState = (book) => ({
  name: book?.name || '',
  description: book?.description || '',
  book_notes: book?.book_notes || '',
  total_pages: book?.total_pages || '',
})

export default function BookForm({ book = null, onClose, onSubmit }) {
  const [formState, setFormState] = useState(() => buildInitialState(book))
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = useCallback((event) => {
    const { name, value } = event.target
    setFormState((prev) => ({
      ...prev,
      [name]: name === 'total_pages' ? Number(value) : value,
    }))
  }, [])

  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault()
      setIsSubmitting(true)
      try {
        await onSubmit({
          ...formState,
          total_pages: Number(formState.total_pages) || 0,
        })
      } finally {
        setIsSubmitting(false)
      }
    },
    [onSubmit, formState]
  )

  return (
    <Modal
      title={book ? 'Cildi Düzenle' : 'Yeni Cilt'}
      onClose={onClose}
      panelClassName="max-w-lg"
    >
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <label className="text-xs text-[var(--text-muted)]">
          Cilt Adı
          <input
            name="name"
            value={formState.name}
            onChange={handleChange}
            className="mt-2 w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
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
            className="mt-2 w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
          />
        </label>
        <label className="text-xs text-[var(--text-muted)]">
          Cilt Notu
          <textarea
            name="book_notes"
            value={formState.book_notes}
            onChange={handleChange}
            rows={4}
            className="mt-2 w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
          />
        </label>
        <label className="text-xs text-[var(--text-muted)]">
          Toplam Sayfa
          <input
            name="total_pages"
            type="number"
            min="2"
            required
            value={formState.total_pages}
            onChange={handleChange}
            className="mt-2 w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
          />
        </label>
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex min-w-[140px] items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-5 py-2.5 text-sm text-white transition hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? (
              <>
                <svg
                  className="h-4 w-4 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  />
                </svg>
                Kaydediliyor...
              </>
            ) : book ? (
              'Değişiklikleri Kaydet'
            ) : (
              'Cildi Kaydet'
            )}
          </button>
        </div>
      </form>
    </Modal>
  )
}