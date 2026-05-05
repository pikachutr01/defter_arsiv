import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useBookStore from '../store/useBookStore.js'
import usePageStore from '../store/usePageStore.js'
import BookCard from '../components/books/BookCard.jsx'
import BookForm from '../components/books/BookForm.jsx'
import EmptyState from '../components/shared/EmptyState.jsx'

export default function Dashboard() {
  const navigate = useNavigate()
  const { books, isLoading, loadBooks, createBook } = useBookStore((state) => ({
    books: state.books,
    isLoading: state.isLoading,
    loadBooks: state.loadBooks,
    createBook: state.createBook,
  }))
  const bulkCreate = usePageStore((state) => state.bulkCreate)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    loadBooks()
  }, [loadBooks])

  const handleCreate = async (payload) => {
    const result = await createBook(payload)
    if (result.success) {
      if (payload.total_pages && payload.total_pages > 0) {
        await bulkCreate(result.data.id, payload.total_pages)
      }
      setShowForm(false)
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl">Ciltler</h2>
          <p className="text-sm text-[var(--text-muted)]">
            Fotoğraf ilerlemesini ve sayfa sayılarını buradan takip et.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm text-white transition hover:bg-[var(--accent-hover)]"
        >
          Cilt Ekle
        </button>
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-8 text-sm text-[var(--text-muted)]">
          Yükleniyor...
        </div>
      ) : books.length === 0 ? (
        <EmptyState
          title="Henüz cilt yok"
          description="Yeni bir cilt ekleyerek sayfalarınızı oluşturabilirsiniz."
          action={
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm text-white"
            >
              İlk Cildi Ekle
            </button>
          }
        />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {books.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              onSelect={() => navigate(`/books/${book.id}`)}
            />
          ))}
        </div>
      )}

      {showForm ? (
        <BookForm onClose={() => setShowForm(false)} onSubmit={handleCreate} />
      ) : null}
    </section>
  )
}
