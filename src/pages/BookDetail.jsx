import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import useBookStore from '../store/useBookStore.js'
import usePageStore from '../store/usePageStore.js'
import PageGrid from '../components/pages/PageGrid.jsx'
import EmptyState from '../components/shared/EmptyState.jsx'
import { ipc } from '../utils/ipc.js'
import BookForm from '../components/books/BookForm.jsx'
import { useToast } from '../components/shared/ToastProvider.jsx'
import ConfirmDialog from '../components/shared/ConfirmDialog.jsx'
import ImageViewer from '../components/images/ImageViewer.jsx'
import Modal from '../components/shared/Modal.jsx'

function BulkUploadModal({ onClose, onStart }) {
  const [sortMethod, setSortMethod] = useState('date')

  return (
    <Modal title="Toplu Resim Ekle" onClose={onClose} panelClassName="max-w-2xl">
      <div className="space-y-4 text-sm text-[var(--text-primary)]">
        <p>
          Seçtiğiniz klasördeki resimler sırasıyla bu cildin sayfalarına eklenecektir.
          <br />
          <span className="text-[var(--danger-text)] font-semibold mt-1 block">
            Dikkat: Varsa mevcut resimlerin üzerine yazılacaktır!
          </span>
        </p>
        <div>
          <label className="mb-2 block text-xs text-[var(--text-muted)]">Sıralama Yöntemi</label>
          <select
            value={sortMethod}
            onChange={e => setSortMethod(e.target.value)}
            className="w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 outline-none focus:border-[var(--accent)]"
          >
            <option value="date" className="bg-[var(--bg-card)] text-[var(--text-primary)]">Oluşturulma Tarihi (Eskiden Yeniye)</option>
            <option value="name" className="bg-[var(--bg-card)] text-[var(--text-primary)]">Alfabetik (İsim Sırası)</option>
          </select>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-[var(--border)] px-4 py-2 text-xs transition hover:bg-[var(--bg-elevated)]">Vazgeç</button>
          <button type="button" onClick={() => onStart(sortMethod)} className="rounded-lg bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[var(--accent-hover)]">Klasör Seç ve Başla</button>
        </div>
      </div>
    </Modal>
  )
}

function ProgressModal({ progress }) {
  const percent = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-xl">
        <h3 className="mb-2 text-lg font-medium text-[var(--text-primary)]">Toplu Yükleme Yapılıyor</h3>
        <p className="mb-6 text-sm text-[var(--text-muted)]">
          Lütfen bekleyin, resimler sıkıştırılarak yükleniyor...<br />
          <span className="mt-1 block opacity-70">Şu an işlenen sayfa: {progress.pageNumber || '-'}</span>
        </p>
        <div className="mb-2 flex justify-between text-xs font-semibold">
          <span>{percent}%</span>
          <span>{progress.current} / {progress.total}</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--bg-elevated)]">
          <div className="h-full bg-[var(--accent)] transition-all duration-300" style={{ width: `${percent}%` }}></div>
        </div>
      </div>
    </div>
  )
}

const FILTERS = [
  { value: 'all', label: 'Tümü' },
  { value: 'with', label: 'Fotoğraflı' },
  { value: 'missing', label: 'Eksik' },
]

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
  // null → taslak yok, string → kullanıcı düzenleme yaptı
  const [bookNotesDraft, setBookNotesDraft] = useState(null)
  const [showEditForm, setShowEditForm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [viewingImage, setViewingImage] = useState(null)

  const [showBulkModal, setShowBulkModal] = useState(false)
  const [bulkProgress, setBulkProgress] = useState(null)

  const { showToast } = useToast()

  const cachedBook = useMemo(
    () => books.find((item) => item.id === bookId) ?? null,
    [bookId, books]
  )

  const book = useMemo(
    () =>
      cachedBook?.id === bookId
        ? cachedBook
        : fetchedBook?.id === bookId
          ? fetchedBook
          : null,
    [bookId, cachedBook, fetchedBook]
  )

  const bookNotes = bookNotesDraft ?? book?.book_notes ?? ''

  useEffect(() => {
    if (bookId) loadPagesByBook(bookId)
  }, [bookId, loadPagesByBook])

  useEffect(() => {
    if (!bookId || cachedBook) return
    let isMounted = true
    ipc.booksGetById(bookId).then((result) => {
      if (isMounted && result.success) setFetchedBook(result.data)
    })
    return () => {
      isMounted = false
    }
  }, [bookId, cachedBook])

  useEffect(() => {
    const unsubscribe = ipc.onImagesBulkUploadProgress((data) => {
      setBulkProgress(data)
    })
    return () => unsubscribe()
  }, [])

  const filteredPages = useMemo(() => {
    if (filter === 'with') {
      return pages.filter((p) => p.is_uploaded === 1)
    }
    if (filter === 'missing') {
      return pages.filter((p) => p.is_uploaded === 0)
    }
    return pages
  }, [filter, pages])

  const handleSaveNotes = useCallback(async () => {
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
      setBookNotesDraft(null)
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
  }, [book, bookId, bookNotes, updateBook, showToast])

  const handleUpdateBook = useCallback(async (payload) => {
    const result = await updateBook(bookId, payload)
    if (result.success) {
      setFetchedBook(result.data)
      setShowEditForm(false)
      setBookNotesDraft(null)
      loadPagesByBook(bookId)
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
  }, [bookId, updateBook, showToast])

  const handleDeleteBook = useCallback(async () => {
    if (!book) return
    const { name: bookName } = book
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
  }, [book, bookId, deleteBook, navigate, showToast])

  const handleNotesChange = useCallback((event) => {
    setBookNotesDraft(event.target.value)
  }, [])

  const handleSelectPage = useCallback(
    (page) => navigate(`/books/${bookId}/pages/${page.id}`),
    [navigate, bookId]
  )

  const goBack = useCallback(() => navigate('/'), [navigate])
  const openEditForm = useCallback(() => setShowEditForm(true), [])
  const closeEditForm = useCallback(() => setShowEditForm(false), [])
  const openDeleteConfirm = useCallback(() => setShowDeleteConfirm(true), [])
  const closeDeleteConfirm = useCallback(() => setShowDeleteConfirm(false), [])

  const handleStartBulkUpload = useCallback(async (sortMethod) => {
    setShowBulkModal(false)
    setBulkProgress({ current: 0, total: pages.length, pageNumber: '-' })

    const result = await ipc.imagesBulkUpload(bookId, sortMethod)

    setBulkProgress(null)

    if (result.success) {
      loadPagesByBook(bookId)
      showToast({
        variant: 'success',
        title: 'Toplu yükleme tamamlandı',
        message: 'Resimler başarıyla sayfalara eklendi.',
      })
    } else {
      if (result.error !== 'Seçim iptal edildi.') {
        showToast({
          variant: 'danger',
          title: 'Yükleme hatası',
          message: result.error || 'İşlem sırasında bir hata oluştu.',
        })
      }
    }
  }, [bookId, pages.length, loadPagesByBook, showToast])

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={goBack}
              className="inline-flex items-center justify-center rounded-xl border border-[var(--border)] p-2 text-[var(--text-primary)] transition hover:border-[var(--accent)]"
              title="Geri"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
                <path
                  d="m15 6-6 6 6 6"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <h2 className="text-2xl">{book?.name || 'Cilt'}</h2>
          </div>
          <p className="text-sm text-[var(--text-muted)]">
            Sayfaları düzenle ve fotoğrafları yükle.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowBulkModal(true)}
            className="rounded-lg bg-[var(--accent-dim)] px-4 py-2 text-xs font-semibold text-[var(--accent)] transition hover:bg-[var(--accent)] hover:text-white"
          >
            Toplu Resim Ekle
          </button>
          <button
            type="button"
            onClick={openEditForm}
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-xs text-[var(--text-primary)] transition hover:border-[var(--accent)]"
          >
            Cildi Düzenle
          </button>
          <button
            type="button"
            onClick={openDeleteConfirm}
            className="rounded-lg border border-[var(--danger-border)] px-4 py-2 text-xs text-[var(--text-primary)] transition hover:border-[var(--danger-strong)]"
          >
            Cildi Sil
          </button>
          {FILTERS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={`rounded-lg px-4 py-2 text-xs transition ${filter === value
                ? 'bg-[var(--accent-dim)] text-[var(--text-primary)]'
                : 'border border-[var(--border)] text-[var(--text-muted)]'
                }`}
            >
              {label}
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
            disabled={bookNotesDraft === null}
            className="rounded-lg bg-[var(--accent)] px-3 py-2 text-xs text-white transition disabled:cursor-not-allowed disabled:opacity-50"
          >
            Notu Kaydet
          </button>
        </div>
        <textarea
          value={bookNotes}
          onChange={handleNotesChange}
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
        <PageGrid pages={filteredPages} onSelect={handleSelectPage} onViewImage={setViewingImage} />
      )}

      {showEditForm && book ? (
        <BookForm book={book} onClose={closeEditForm} onSubmit={handleUpdateBook} />
      ) : null}

      {showDeleteConfirm && book ? (
        <ConfirmDialog
          title="Cildi Sil"
          message={`${book.name} ve ona bağlı tüm sayfalar silinecek. Devam etmek istiyor musun?`}
          onCancel={closeDeleteConfirm}
          onConfirm={handleDeleteBook}
        />
      ) : null}

      {viewingImage && (
        <ImageViewer
          title={`Sayfa ${viewingImage.page_number}`}
          imagePath={viewingImage.image}
          timestamp={viewingImage.updated_at ? new Date(viewingImage.updated_at).getTime() : null}
          onClose={() => setViewingImage(null)}
        />
      )}

      {showBulkModal && (
        <BulkUploadModal
          onClose={() => setShowBulkModal(false)}
          onStart={handleStartBulkUpload}
        />
      )}

      {bulkProgress && <ProgressModal progress={bulkProgress} />}
    </section>
  )
}