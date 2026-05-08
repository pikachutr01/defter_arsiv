import { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import { useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom'
import useBookStore from '../store/useBookStore.js'
import usePageStore from '../store/usePageStore.js'
import usePdfQueueStore from '../store/usePdfQueueStore.js'
import useUiStore from '../store/useUiStore.js'
import PageGrid from '../components/pages/PageGrid.jsx'
import EmptyState from '../components/shared/EmptyState.jsx'
import { ipc } from '../utils/ipc.js'
import BookForm from '../components/books/BookForm.jsx'
import { useToast } from '../components/shared/ToastProvider.jsx'
import ConfirmDialog from '../components/shared/ConfirmDialog.jsx'
import ImageViewer from '../components/images/ImageViewer.jsx'
import Modal from '../components/shared/Modal.jsx'

function BulkUploadModal({ onClose, onStart }) {
  const [sortMethod, setSortMethod] = useState('name')

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

function NoteModal({ page, draft, onChange, onSave, onClose }) {
  if (!page) return null
  return (
    <Modal title={`Sayfa ${page.page_number} Notu`} onClose={onClose} panelClassName="max-w-2xl">
      <div className="space-y-4 text-sm text-[var(--text-primary)]">
        <textarea
          value={draft}
          onChange={e => onChange(e.target.value)}
          rows={10}
          placeholder="Bu sayfa için alınacak notlar..."
          className="w-full resize-y rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-3 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
        />
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-[var(--border)] px-4 py-2 text-xs transition hover:bg-[var(--bg-elevated)]">Vazgeç</button>
          <button type="button" onClick={onSave} className="rounded-lg bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[var(--accent-hover)]">Kaydet</button>
        </div>
      </div>
    </Modal>
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
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const bookId = Number(id)
  const virtuosoRef = useRef(null)

  // Arama sayfasından gelindi mi?
  const fromSearch = location.state?.fromSearch ?? false
  const searchReturnState = fromSearch ? location.state : null

  const books = useBookStore((state) => state.books)
  const updateBook = useBookStore((state) => state.updateBook)
  const deleteBook = useBookStore((state) => state.deleteBook)
  const pages = usePageStore((state) => state.pages)
  const loadPagesByBook = usePageStore((state) => state.loadPagesByBook)

  const [filter, setFilter] = useState('all')
  const [fetchedBook, setFetchedBook] = useState(null)
  const [showEditForm, setShowEditForm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [viewingImage, setViewingImage] = useState(null)

  const [showBulkModal, setShowBulkModal] = useState(false)
  const [bulkProgress, setBulkProgress] = useState(null)

  const [editingNotePage, setEditingNotePage] = useState(null)
  const [pageNoteDraft, setPageNoteDraft] = useState('')
  const [pageToDeleteImage, setPageToDeleteImage] = useState(null)
  const [uploadingPageIds, setUploadingPageIds] = useState(() => new Set())
  const [highlightedPageId, setHighlightedPageId] = useState(null)

  const { showToast } = useToast()

  const pdfItems = usePdfQueueStore((state) => state.items)
  const togglePdfItem = usePdfQueueStore((state) => state.toggleItem)
  const removePdfItem = usePdfQueueStore((state) => state.removeItem)

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

  const scrollToPageId = searchParams.get('scrollTo')
  useEffect(() => {
    if (scrollToPageId && filteredPages.length > 0 && virtuosoRef.current) {
      const index = filteredPages.findIndex((p) => p.id === Number(scrollToPageId))
      if (index !== -1) {
        setTimeout(() => {
          // 'auto' ile anlık atlama yap — smooth scroll VirtuosoGrid'in
          // kartı render etmesinden önce biter ve animasyon kaçırılır
          virtuosoRef.current?.scrollToIndex({ index, align: 'center', behavior: 'auto' })
          // Kart render edildikten kısa süre sonra animasyonu tetikle
          setTimeout(() => setHighlightedPageId(Number(scrollToPageId)), 150)
        }, 100)
      }
      // location.state'i koru — akı setSearchParams state'i siler
      searchParams.delete('scrollTo')
      setSearchParams(searchParams, { replace: true, state: location.state })
    }
  }, [scrollToPageId, filteredPages, searchParams, setSearchParams, location.state])




  const handleUpdateBook = useCallback(async (payload) => {
    const result = await updateBook(bookId, payload)
    if (result.success) {
      setFetchedBook(result.data)
      setShowEditForm(false)
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
      duration: 6000,
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

  const handleTogglePdf = useCallback((page) => {
    if (!page?.image) return
    togglePdfItem({
      pageId: page.id,
      imagePath: page.image,
      pageNumber: page.page_number,
      bookId: page.book_id,
      bookName: book?.name || '',
    })
  }, [togglePdfItem, book])

  const handleUploadImage = useCallback(async (pageId, sourcePath = null) => {
    // Dialog akışında: önce sadece dosyayı seç, seçim tamamlandıktan sonra spinner başlat
    let resolvedPath = sourcePath
    if (!resolvedPath) {
      const selectResult = await ipc.imagesSelectFromDialog()
      if (!selectResult.success) return // iptal veya hata — spinner hiç başlamaz
      resolvedPath = selectResult.filePath
    }

    // Dosya yolu kesinleşti, şimdi spinner başlat
    setUploadingPageIds((prev) => new Set(prev).add(pageId))
    try {
      const result = await ipc.imagesUpload(pageId, resolvedPath)
      if (result.success) {
        loadPagesByBook(bookId)
        showToast({ variant: 'success', title: 'Görsel güncellendi', message: 'Sayfa görseli başarıyla kaydedildi.' })
        removePdfItem(pageId)
        return
      }
      showToast({ variant: 'danger', title: 'Görsel yüklenemedi', message: result.error || 'Görsel seçilirken beklenmeyen bir sorun oluştu.' })
    } finally {
      setUploadingPageIds((prev) => { const next = new Set(prev); next.delete(pageId); return next })
    }
  }, [bookId, loadPagesByBook, showToast, removePdfItem])

  const handleDeleteImage = useCallback(async () => {
    if (!pageToDeleteImage) return;

    const result = await ipc.imagesDelete(pageToDeleteImage)
    if (result.success) {
      removePdfItem(pageToDeleteImage)
      loadPagesByBook(bookId)
      showToast({ variant: 'success', title: 'Görsel silindi', message: 'Sayfa görseli kaldırıldı.' })
    } else {
      showToast({ variant: 'danger', title: 'Görsel silinemedi', message: result.error || 'Görsel silinirken beklenmeyen bir hata oluştu.' })
    }
    setPageToDeleteImage(null)
  }, [pageToDeleteImage, bookId, loadPagesByBook, showToast, removePdfItem])

  const confirmDeleteImage = useCallback((pageId) => {
    setPageToDeleteImage(pageId)
  }, [])

  const handleRotateImage = useCallback(async (pageId) => {
    const result = await ipc.imagesRotate(pageId)
    if (result.success) {
      loadPagesByBook(bookId)
      showToast({ variant: 'success', title: 'Görsel döndürüldü', message: 'Resim sola döndürüldü.' })
    } else {
      showToast({ variant: 'danger', title: 'Döndürme başarısız', message: result.error || 'Resim döndürülürken bir hata oluştu.' })
    }
  }, [bookId, loadPagesByBook, showToast])

  const handleRevealImage = useCallback(async (imagePath) => {
    if (!imagePath) return
    const result = await ipc.imagesRevealInFolder(imagePath)
    if (!result.success) {
      showToast({ variant: 'danger', title: 'Klasör açılamadı', message: result.error || 'Görselin bulunduğu klasör açılamadı.' })
    }
  }, [showToast])

  const handleEditNote = useCallback((page) => {
    setEditingNotePage(page)
    setPageNoteDraft(page.page_notes || '')
  }, [])

  const handleSavePageNote = useCallback(async () => {
    if (!editingNotePage) return
    const result = await ipc.pagesUpdate(editingNotePage.id, { page_notes: pageNoteDraft })
    if (result.success) {
      loadPagesByBook(bookId)
      showToast({ variant: 'success', title: 'Notlar kaydedildi', message: 'Sayfa notu güncellendi.' })
      setEditingNotePage(null)
      return
    }
    showToast({ variant: 'danger', title: 'Kayıt başarısız', message: result.error || 'Notlar kaydedilirken beklenmeyen bir hata oluştu.' })
  }, [editingNotePage, pageNoteDraft, bookId, loadPagesByBook, showToast])

  const goBack = useCallback(() => {
    if (fromSearch && searchReturnState) {
      navigate('/search', {
        state: {
          restoreQuery: searchReturnState.query,
          restoreType: searchReturnState.searchType,
          restorePage: searchReturnState.page,
        },
      })
    } else {
      navigate('/')
    }
  }, [navigate, fromSearch, searchReturnState])

  const setHeaderBackNav = useUiStore((state) => state.setHeaderBackNav)
  const clearHeaderBackNav = useUiStore((state) => state.clearHeaderBackNav)

  // TopBar'a back nav bilgisini gönder, unmount'ta temizle
  useEffect(() => {
    setHeaderBackNav({
      label: fromSearch ? 'Aramaya Dön' : 'Geri',
      action: goBack,
      bookName: book?.name || '',
      bookDescription: book?.description || '',
      isFromSearch: fromSearch,
    })
    return () => clearHeaderBackNav()
  }, [fromSearch, goBack, book?.name, book?.description, setHeaderBackNav, clearHeaderBackNav])

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
          <h2 className="text-2xl">{book?.name || 'Cilt'}</h2>
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

      {book?.book_notes ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3">
          <p className="text-xs text-[var(--text-muted)] mb-1">Cilt Notu</p>
          <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">{book.book_notes}</p>
        </div>
      ) : null}

      {filteredPages.length === 0 ? (
        <EmptyState
          title="Sayfa bulunamadı"
          description="Eşleşen kayıt bulunamadı."
        />
      ) : (
        <PageGrid
          pages={filteredPages}
          onViewImage={setViewingImage}
          onUpload={handleUploadImage}
          onDelete={confirmDeleteImage}
          onRotate={handleRotateImage}
          onTogglePdf={handleTogglePdf}
          onReveal={handleRevealImage}
          onEditNote={handleEditNote}
          pdfItems={pdfItems}
          uploadingPageIds={uploadingPageIds}
          virtuosoRef={virtuosoRef}
          highlightedPageId={highlightedPageId}
          onHighlightEnd={() => setHighlightedPageId(null)}
        />
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

      {pageToDeleteImage ? (
        <ConfirmDialog
          title="Resmi Sil"
          message="Bu sayfaya ait resim silinecek. Devam etmek istiyor musunuz?"
          onCancel={() => setPageToDeleteImage(null)}
          onConfirm={handleDeleteImage}
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

      <NoteModal
        page={editingNotePage}
        draft={pageNoteDraft}
        onChange={setPageNoteDraft}
        onSave={handleSavePageNote}
        onClose={() => setEditingNotePage(null)}
      />
    </section>
  )
}