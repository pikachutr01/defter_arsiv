import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import useBookStore from '../store/useBookStore.js'
import usePageStore from '../store/usePageStore.js'
import PageGrid from '../components/pages/PageGrid.jsx'
import EmptyState from '../components/shared/EmptyState.jsx'
import { ipc } from '../utils/ipc.js'

export default function BookDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const bookId = Number(id)
  const books = useBookStore((state) => state.books)
  const updateBook = useBookStore((state) => state.updateBook)
  const { pages, loadPagesByBook } = usePageStore((state) => ({
    pages: state.pages,
    loadPagesByBook: state.loadPagesByBook,
  }))
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    if (bookId) {
      loadPagesByBook(bookId)
    }
  }, [bookId, loadPagesByBook])

  const [book, setBook] = useState(null)
  const [bookNotes, setBookNotes] = useState('')

  useEffect(() => {
    const cached = books.find((item) => item.id === bookId)
    if (cached) {
      setBook(cached)
      setBookNotes(cached.book_notes || '')
      return
    }
    const loadBook = async () => {
      const result = await ipc.booksGetById(bookId)
      if (result.success) {
        setBook(result.data)
        setBookNotes(result.data?.book_notes || '')
      }
    }
    loadBook()
  }, [bookId, books])

  const handleSaveNotes = async () => {
    if (!book) return
    const payload = {
      name: book.name,
      description: book.description,
      total_pages: book.total_pages,
      book_notes: bookNotes,
    }
    const result = await updateBook(bookId, payload)
    if (result?.success) {
      setBook(result.data)
    }
  }

  const filteredPages = useMemo(() => {
    if (filter === 'with') {
      return pages.filter(
        (page) => page.side_a_uploaded === 1 || page.side_b_uploaded === 1
      )
    }
    if (filter === 'missing') {
      return pages.filter(
        (page) => page.side_a_uploaded === 0 || page.side_b_uploaded === 0
      )
    }
    return pages
  }, [filter, pages])

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl">{book?.name || 'Cilt'}</h2>
          <p className="text-sm text-[var(--text-muted)]">
            Sayfaları düzenle ve fotoğrafları yükle.
          </p>
        </div>
        <div className="flex gap-2">
          {['all', 'with', 'missing'].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={`rounded-lg px-4 py-2 text-xs transition ${
                filter === value
                  ? 'bg-[var(--accent-dim)] text-white'
                  : 'border border-[var(--border)] text-[var(--text-muted)]'
              }`}
            >
              {value === 'all'
                ? 'Tümü'
                : value === 'with'
                  ? 'Fotoğraflı'
                  : 'Eksik'}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-lg">Cilt Notu</h3>
          <button
            type="button"
            onClick={handleSaveNotes}
            className="rounded-lg bg-[var(--accent)] px-3 py-2 text-xs text-white"
          >
            Notu Kaydet
          </button>
        </div>
        <textarea
          value={bookNotes}
          onChange={(event) => setBookNotes(event.target.value)}
          rows={4}
          placeholder="Cilde özel not"
          className="mt-3 w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-sm text-[var(--text-primary)]"
        />
      </div>

      {filteredPages.length === 0 ? (
        <EmptyState
          title="Sayfa bulunamadı"
          description="Bu ciltte henüz sayfa kaydı yok."
        />
      ) : (
        <PageGrid
          pages={filteredPages}
          onSelect={(page) => navigate(`/books/${bookId}/pages/${page.id}`)}
        />
      )}
    </section>
  )
}
