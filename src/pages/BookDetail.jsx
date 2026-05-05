import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import useBookStore from '../store/useBookStore.js'
import usePageStore from '../store/usePageStore.js'
import PageGrid from '../components/pages/PageGrid.jsx'
import EmptyState from '../components/shared/EmptyState.jsx'
import { ipc } from '../utils/ipc.js'
import BookForm from '../components/books/BookForm.jsx'
import { useToast } from '../components/shared/ToastProvider.jsx'
import ConfirmDialog from '../components/shared/ConfirmDialog.jsx'

export default function BookDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const bookId = Number(id)
  const books = useBookStore((state) => state.books)
  const updateBook = useBookStore((state) => state.updateBook)
  const deleteBook = useBookStore((state) => state.deleteBook)
  const pages = usePageStore((state) => state.pages)
  const loadPagesByBook = usePageStore((state) => state.loadPagesByBook)
  const [filter, setFilter] = useState('all')
  const [fetchedBook, setFetchedBook] = useState(null)
  const [bookNotesDraft, setBookNotesDraft] = useState('')
  const [hasBookNotesDraft, setHasBookNotesDraft] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const { showToast } = useToast()

  const cachedBook = useMemo(
    () => books.find((item) => item.id === bookId) || null,
    [bookId, books]
  )

  const book =
    cachedBook?.id === bookId
      ? cachedBook
      : fetchedBook?.id === bookId
        ? fetchedBook
        : null

  const bookNotes = hasBookNotesDraft ? bookNotesDraft : book?.book_notes || ''

  useEffect(() => {
    if (bookId) {
      loadPagesByBook(bookId)
    }
  }, [bookId, loadPagesByBook])

  useEffect(() => {
    if (!bookId || cachedBook) {
      return
    }

    let isMounted = true

    const loadBook = async () => {
      const result = await ipc.booksGetById(bookId)
      if (isMounted && result.success) {
        setFetchedBook(result.data)
      }
    }

    loadBook()

    return () => {
      isMounted = false
    }
  }, [bookId, cachedBook])

  const handleSaveNotes = async () => {
    if (!book) return
    const payload = {
      name: book.name,
      description: book.description,
      total_pages: book.total_pages,
      book_notes: bookNotes,
      cover_source_path: null,
      remove_cover: false,
    }
    const result = await updateBook(bookId, payload)
    if (result?.success) {
      setFetchedBook(result.data)
      setBookNotesDraft('')
      setHasBookNotesDraft(false)
      showToast({
        variant: 'success',
        title: 'Notlar kaydedildi',
        message: 'Cilt notu başarıyla güncellendi.',
      })
      return
    }

    showToast({
      variant: 'danger',
      title: 'Kayıt başarısız',
      message: result?.error || 'Cilt notu kaydedilemedi.',
    })
  }

  const handleUpdateBook = async (payload) => {
    const result = await updateBook(bookId, payload)
    if (result.success) {
      setFetchedBook(result.data)
      setShowEditForm(false)
      setBookNotesDraft('')
      setHasBookNotesDraft(false)
      showToast({
        variant: 'success',
        title: 'Cilt güncellendi',
        message: 'Cilt bilgileri başarıyla güncellendi.',
      })
      return
    }

    showToast({
      variant: 'danger',
      title: 'Güncelleme başarısız',
      message: result.error || 'Cilt bilgileri güncellenemedi.',
    })
  }

  const handleDeleteBook = async () => {
    if (!book) {
      return
    }

    const bookName = book.name
    const result = await deleteBook(bookId)
    setShowDeleteConfirm(false)

    if (result.success) {
      showToast({
        variant: 'success',
        title: 'Cilt silindi',
        message: `${bookName} arşivden kaldırıldı.`,
      })
      navigate('/')
      return
    }

    showToast({
      variant: 'danger',
      title: 'Cilt silinemedi',
      message: result.error || 'Cilt silinirken beklenmeyen bir hata oluştu.',
    })
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
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowEditForm(true)}
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-xs text-[var(--text-primary)] transition hover:border-[var(--accent)]"
          >
            Cildi Düzenle
          </button>
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="rounded-lg border border-[var(--danger-border)] px-4 py-2 text-xs text-[var(--text-primary)] transition hover:border-[var(--danger-strong)]"
          >
            Cildi Sil
          </button>
          {['all', 'with', 'missing'].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={`rounded-lg px-4 py-2 text-xs transition ${
                filter === value
                  ? 'bg-[var(--accent-dim)] text-[var(--text-primary)]'
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
          onChange={(event) => {
            setBookNotesDraft(event.target.value)
            setHasBookNotesDraft(true)
          }}
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

      {showEditForm && book ? (
        <BookForm
          book={book}
          onClose={() => setShowEditForm(false)}
          onSubmit={handleUpdateBook}
        />
      ) : null}

      {showDeleteConfirm && book ? (
        <ConfirmDialog
          title="Cildi Sil"
          message={`${book.name} ve ona bağlı tüm sayfalar silinecek. Devam etmek istiyor musun?`}
          onCancel={() => setShowDeleteConfirm(false)}
          onConfirm={handleDeleteBook}
        />
      ) : null}
    </section>
  )
}
