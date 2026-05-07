import React, { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { VirtuosoGrid } from 'react-virtuoso'
import useBookStore from '../store/useBookStore.js'
import usePageStore from '../store/usePageStore.js'
import BookCard from '../components/books/BookCard.jsx'
import BookForm from '../components/books/BookForm.jsx'
import EmptyState from '../components/shared/EmptyState.jsx'
import SearchBar from '../components/shared/SearchBar.jsx'
import { useToast } from '../components/shared/ToastProvider.jsx'
import ConfirmDialog from '../components/shared/ConfirmDialog.jsx'

const normalizeText = (value) =>
  String(value || '')
    .toLocaleLowerCase('tr')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')

const gridComponents = {
  List: React.forwardRef((props, ref) => (
    <div {...props} ref={ref} className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" />
  )),
  Item: React.forwardRef((props, ref) => (
    <div {...props} ref={ref} className="h-full" />
  ))
}

export default function Dashboard() {
  const navigate = useNavigate()
  const books = useBookStore((state) => state.books)
  const isLoading = useBookStore((state) => state.isLoading)
  const loadBooks = useBookStore((state) => state.loadBooks)
  const createBook = useBookStore((state) => state.createBook)
  const updateBook = useBookStore((state) => state.updateBook)
  const deleteBook = useBookStore((state) => state.deleteBook)
  const bulkCreate = usePageStore((state) => state.bulkCreate)
  const [bookFormState, setBookFormState] = useState(null)
  const [pendingDeleteBook, setPendingDeleteBook] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const deferredSearchQuery = useDeferredValue(searchQuery)
  const { showToast } = useToast()

  useEffect(() => {
    loadBooks()
  }, [loadBooks])

  const processedBooks = useMemo(() => {
    return books.map((book) => ({
      ...book,
      _searchString: normalizeText(
        [book.name, book.description, book.book_notes].filter(Boolean).join(' ')
      ),
    }))
  }, [books])

  const filteredBooks = useMemo(() => {
    const query = normalizeText(deferredSearchQuery).trim()
    if (!query) return books

    return processedBooks.filter((book) => book._searchString.includes(query))
  }, [processedBooks, deferredSearchQuery, books])

  const handleCreate = useCallback(
    async (payload) => {
      const result = await createBook(payload)
      if (result.success) {
        if (payload.total_pages > 0) {
          await bulkCreate(result.data.id, payload.total_pages)
        }
        setBookFormState(null)
        showToast({
          variant: 'success',
          title: 'Cilt oluşturuldu',
          message: 'Yeni cilt başarıyla kaydedildi.',
        })
        return
      }
      showToast({
        variant: 'danger',
        title: 'Cilt oluşturulamadı',
        message: result.error || 'Cilt kaydedilirken beklenmeyen bir hata oluştu.',
      })
    },
    [createBook, bulkCreate, showToast]
  )

  const handleUpdate = useCallback(
    async (payload) => {
      const targetBook = bookFormState?.book
      if (!targetBook) return

      const result = await updateBook(targetBook.id, payload)
      if (result.success) {
        setBookFormState(null)
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
    },
    [bookFormState?.book, updateBook, showToast]
  )

  const handleDeleteBook = useCallback(async () => {
    if (!pendingDeleteBook) return

    const { id, name: bookName } = pendingDeleteBook
    const result = await deleteBook(id)
    setPendingDeleteBook(null)

    if (result.success) {
      showToast({
        variant: 'success',
        title: 'Cilt silindi',
        message: `${bookName} arşivden kaldırıldı.`,
      })
      return
    }
    showToast({
      variant: 'danger',
      title: 'Cilt silinemedi',
      message: result.error || 'Cilt silinirken beklenmeyen bir hata oluştu.',
    })
  }, [pendingDeleteBook, deleteBook, showToast])

  const openCreateForm = useCallback(() => setBookFormState({ mode: 'create', book: null }), [])
  const closeForm = useCallback(() => setBookFormState(null), [])
  const cancelDelete = useCallback(() => setPendingDeleteBook(null), [])

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl">Ciltler</h2>
          <p className="text-sm text-[var(--text-muted)]">
            Fotoğraf ilerlemesini ve sayfa sayılarını buradan takip et.
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:min-w-[18rem] sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={openCreateForm}
            className="rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)]"
          >
            Cilt Ekle
          </button>
          <div className="sm:min-w-[13rem] sm:flex-1">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Cilt adı, açıklama veya not ara"
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-8 text-sm text-[var(--text-muted)]">
          Yükleniyor...
        </div>
      ) : books.length === 0 ? (
        <EmptyState
          title="Henüz cilt yok"
          description="Yeni bir cilt ekleyerek sayfalarınızı oluşturmaya başlayabilirsiniz."
          action={
            <button
              type="button"
              onClick={openCreateForm}
              className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm text-white"
            >
              İlk Cildi Ekle
            </button>
          }
        />
      ) : filteredBooks.length === 0 ? (
        <EmptyState
          title="Sonuç bulunamadı"
          description="Arama ifadesini değiştirerek tekrar deneyebilirsin."
        />
      ) : (
        <VirtuosoGrid
          useWindowScroll
          data={filteredBooks}
          components={gridComponents}
          itemContent={(index, book) => (
            <BookCard
              book={book}
              className="transition duration-300 ease-out h-full"
              onSelect={() => navigate(`/books/${book.id}`)}
              onEdit={() => setBookFormState({ mode: 'edit', book })}
              onDelete={() => setPendingDeleteBook(book)}
            />
          )}
        />
      )}

      {bookFormState ? (
        <BookForm
          book={bookFormState.book}
          onClose={closeForm}
          onSubmit={bookFormState.mode === 'edit' ? handleUpdate : handleCreate}
        />
      ) : null}

      {pendingDeleteBook ? (
        <ConfirmDialog
          title="Cildi Sil"
          message={`${pendingDeleteBook.name} ve ona bağlı tüm sayfalar silinecek. Devam etmek istiyor musun?`}
          onCancel={cancelDelete}
          onConfirm={handleDeleteBook}
        />
      ) : null}
    </section>
  )
}