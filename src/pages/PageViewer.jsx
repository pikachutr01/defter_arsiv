import { useCallback, useEffect, useMemo, useState, memo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import useSettingsStore from '../store/useSettingsStore.js'
import { ipc } from '../utils/ipc.js'
import { toLocalAssetUrl } from '../utils/paths.js'
import ImageUploader from '../components/images/ImageUploader.jsx'
import ImageViewer from '../components/images/ImageViewer.jsx'
import ConfirmDialog from '../components/shared/ConfirmDialog.jsx'
import { useToast } from '../components/shared/ToastProvider.jsx'
import usePdfQueueStore from '../store/usePdfQueueStore.js'

function useDragDrop(onFileDrop) {
  const [isDragging, setIsDragging] = useState(false)

  const handleDragOver = useCallback((event) => {
    event.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => setIsDragging(false), [])

  const handleDrop = useCallback(
    async (event) => {
      event.preventDefault()
      setIsDragging(false)
      const droppedFile = event.dataTransfer.files?.[0]
      if (!droppedFile) return
      const filePath = ipc.systemGetPathForFile(droppedFile)
      if (!filePath) return
      await onFileDrop(filePath)
    },
    [onFileDrop]
  )

  return { isDragging, handleDragOver, handleDragLeave, handleDrop }
}

const PageImagePanel = memo(function PageImagePanel({
  imagePath,
  updatedAt,
  onOpenViewer,
  onFileDrop,
  onUpload,
  storagePath,
}) {
  const timeParam = updatedAt ? new Date(updatedAt).getTime() : null
  const imageUrl = toLocalAssetUrl(storagePath, imagePath, timeParam)
  const { isDragging, handleDragOver, handleDragLeave, handleDrop } = useDragDrop(onFileDrop)

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative flex h-[350px] lg:h-[55vh] lg:max-h-[600px] w-full overflow-hidden rounded-2xl border transition ${isDragging
        ? 'border-[var(--accent)] ring-4 ring-[rgba(79,142,247,0.15)]'
        : 'border-[var(--border)]'
        } bg-[rgba(255,255,255,0.02)]`}
    >
      {imageUrl ? (
        <button
          type="button"
          onClick={onOpenViewer}
          className="group relative flex h-full w-full items-center justify-center bg-[var(--bg-elevated)]"
        >
          <img
            src={imageUrl}
            alt="Sayfa görseli"
            className="absolute inset-0 h-full w-full object-contain p-2 transition duration-300 group-hover:scale-[1.02]"
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center bg-gradient-to-t from-[rgba(7,11,18,0.85)] via-[rgba(7,11,18,0.1)] to-transparent p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <span className="rounded-full bg-black/40 px-3 py-1.5 text-xs text-white backdrop-blur-md">
              Tam Boyut Görüntüle
            </span>
          </div>
        </button>
      ) : (
        <div className={`flex h-full w-full items-center justify-center transition ${isDragging ? 'opacity-70' : ''}`}>
          <div className="w-full max-w-md px-6">
            <ImageUploader label="Görsel Yükle veya Sürükle" onUpload={onUpload} />
          </div>
        </div>
      )}
    </div>
  )
})

export default function PageViewer() {
  const { pageId } = useParams()
  const navigate = useNavigate()
  const numericId = Number(pageId)
  const [page, setPage] = useState(null)
  const [notes, setNotes] = useState({ page: '' })
  const [isViewerOpen, setIsViewerOpen] = useState(false)
  const [isPendingDelete, setIsPendingDelete] = useState(false)
  const [isSavingNotes, setIsSavingNotes] = useState(false)

  const storagePath = useSettingsStore((state) => state.storagePath)
  const togglePdfItem = usePdfQueueStore((state) => state.toggleItem)
  const removePdfItem = usePdfQueueStore((state) => state.removeItem)
  const pdfItems = usePdfQueueStore((state) => state.items)
  const { showToast } = useToast()

  const syncPageState = useCallback((data) => {
    setPage(data)
    setNotes({
      page: data?.page_notes || '',
    })
  }, [])

  const loadPage = useCallback(async () => {
    const result = await ipc.pagesGetById(numericId)
    if (result.success) syncPageState(result.data)
    return result
  }, [numericId, syncPageState])

  useEffect(() => {
    if (!numericId) return
    let isMounted = true
    ipc.pagesGetById(numericId).then((result) => {
      if (isMounted && result.success) syncPageState(result.data)
    })
    return () => {
      isMounted = false
    }
  }, [numericId, syncPageState])

  const isSelectedForPdf = useMemo(() => {
    return pdfItems.some((item) => item.pageId === numericId)
  }, [pdfItems, numericId])

  const runImageUpload = useCallback(
    async (sourcePath = null) => {
      const result = sourcePath
        ? await ipc.imagesUpload(numericId, sourcePath)
        : await ipc.imagesUploadFromDialog(numericId)

      if (result.success) {
        await loadPage()
        showToast({
          variant: 'success',
          title: 'Görsel güncellendi',
          message: 'Sayfa görseli başarıyla kaydedildi.',
        })
        return
      }
      if (result.error === 'Seçim iptal edildi.') return
      showToast({
        variant: 'danger',
        title: 'Görsel yüklenemedi',
        message: result.error || 'Görsel seçilirken beklenmeyen bir sorun oluştu.',
      })
    },
    [numericId, loadPage, showToast]
  )

  const handleDeleteImage = useCallback(async () => {
    if (!isPendingDelete) return
    const result = await ipc.imagesDelete(numericId)
    setIsPendingDelete(false)
    if (result.success) {
      if (isSelectedForPdf) {
        removePdfItem(numericId)
      }
      await loadPage()
      showToast({
        variant: 'success',
        title: 'Görsel silindi',
        message: 'Sayfa görseli kaldırıldı.',
      })
      return
    }
    showToast({
      variant: 'danger',
      title: 'Görsel silinemedi',
      message: result.error || 'Görsel silinirken beklenmeyen bir hata oluştu.',
    })
  }, [isPendingDelete, numericId, loadPage, showToast, isSelectedForPdf, removePdfItem])

  const handleRevealImage = useCallback(
    async (imagePath) => {
      if (!imagePath) return
      const result = await ipc.imagesRevealInFolder(imagePath)
      if (!result.success) {
        showToast({
          variant: 'danger',
          title: 'Klasör açılamadı',
          message: result.error || 'Görselin bulunduğu klasör açılamadı.',
        })
      }
    },
    [showToast]
  )

  const handleSaveNotes = useCallback(async () => {
    setIsSavingNotes(true)
    const result = await ipc.pagesUpdate(numericId, {
      page_notes: notes.page,
    })
    setIsSavingNotes(false)
    if (result.success) {
      syncPageState(result.data)
      showToast({ variant: 'success', title: 'Notlar kaydedildi', message: 'Sayfa notu güncellendi.' })
      return
    }
    showToast({
      variant: 'danger',
      title: 'Kayıt başarısız',
      message: result.error || 'Notlar kaydedilirken beklenmeyen bir hata oluştu.',
    })
  }, [numericId, notes, syncPageState, showToast])

  const handleNotesChangePage = useCallback((event) => setNotes({ page: event.target.value }), [])
  const handleUpload = useCallback(() => runImageUpload(), [runImageUpload])

  const handleRotate = useCallback(async () => {
    const result = await ipc.imagesRotate(numericId)
    if (result.success) {
      await loadPage()
      showToast({ variant: 'success', title: 'Görsel döndürüldü', message: 'Resim sola döndürüldü.' })
    } else {
      showToast({ variant: 'danger', title: 'Döndürme başarısız', message: result.error || 'Resim döndürülürken bir hata oluştu.' })
    }
  }, [numericId, loadPage, showToast])

  const handleDelete = useCallback(() => setIsPendingDelete(true), [])
  const handleOpenViewer = useCallback(() => setIsViewerOpen(true), [])
  const handleReveal = useCallback(() => handleRevealImage(page?.image || null), [handleRevealImage, page])
  const handleFileDrop = useCallback((filePath) => runImageUpload(filePath), [runImageUpload])

  const handleTogglePdf = useCallback(() => {
    if (!page?.image) return
    togglePdfItem({
      pageId: numericId,
      imagePath: page.image,
      pageNumber: page.page_number,
      bookId: page.book_id,
      bookName: page.book_name || '',
    })
  }, [togglePdfItem, numericId, page])

  const closeViewer = useCallback(() => setIsViewerOpen(false), [])
  const cancelDelete = useCallback(() => setIsPendingDelete(false), [])
  const goBack = useCallback(() => navigate(`/books/${page ? page.book_id : ''}`), [navigate, page])

  return (
    <section className="flex flex-col h-full space-y-6">
      {/* Header Alanı */}
      <div className="flex items-center gap-3">
        {page?.book_id && (
          <button
            type="button"
            onClick={goBack}
            className="group flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-primary)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
            title="Kitaba Dön"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 transition-transform group-hover:-translate-x-0.5" fill="none">
              <path d="m15 6-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
        <h2 className="text-2xl font-medium tracking-tight">
          Sayfa Görüntüle <span className="text-[var(--text-secondary)]">{page?.page_number ? `#${page.page_number}` : ''}</span>
        </h2>
      </div>

      {/* Ana Grid Düzeni */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start flex-1">

        {/* Sol Sütun: Görsel Önizleme (Geniş Alan) */}
        <div className="lg:col-span-8 flex flex-col">
          <PageImagePanel
            imagePath={page?.image}
            updatedAt={page?.updated_at}
            onOpenViewer={handleOpenViewer}
            onFileDrop={handleFileDrop}
            onUpload={handleUpload}
            storagePath={storagePath}
          />
        </div>

        {/* Sağ Sütun: İşlemler ve Notlar */}
        <div className="lg:col-span-4 flex flex-col gap-4 h-full">

          {/* Araç Çubuğu (Toolbar) - Yalnızca resim varsa gösterilir */}
          {page?.image && (
            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-2">
              <button
                type="button"
                onClick={handleTogglePdf}
                title={isSelectedForPdf ? "PDF'den Çıkar" : "PDF'e Ekle"}
                className={`flex h-10 w-10 items-center justify-center rounded-xl transition-all ${isSelectedForPdf
                  ? 'bg-[var(--accent)] text-white shadow-md shadow-[var(--accent)]/20'
                  : 'bg-transparent text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--accent)]'
                  }`}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  {isSelectedForPdf ? (
                    <line x1="9" y1="15" x2="15" y2="15"></line>
                  ) : (
                    <>
                      <line x1="12" y1="12" x2="12" y2="18"></line>
                      <line x1="9" y1="15" x2="15" y2="15"></line>
                    </>
                  )}
                </svg>
              </button>

              <div className="mx-1 h-6 w-px bg-[var(--border)]"></div>

              <button type="button" onClick={handleUpload} title="Resmi Değiştir" className="flex h-10 w-10 items-center justify-center rounded-xl text-[var(--text-primary)] transition hover:bg-[var(--bg-elevated)] hover:text-[var(--accent)]">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
              </button>

              <button type="button" onClick={handleRotate} title="Sola Döndür" className="flex h-10 w-10 items-center justify-center rounded-xl text-[var(--text-primary)] transition hover:bg-[var(--bg-elevated)] hover:text-[var(--accent)]">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>
              </button>

              <button type="button" onClick={handleReveal} title="Klasörde Bul" className="flex h-10 w-10 items-center justify-center rounded-xl text-[var(--text-primary)] transition hover:bg-[var(--bg-elevated)] hover:text-[var(--accent)]">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
              </button>

              <div className="flex-1"></div>

              <button type="button" onClick={handleDelete} title="Resmi Sil" className="flex h-10 w-10 items-center justify-center rounded-xl text-[var(--danger-text)] transition hover:bg-[var(--danger-surface-soft)]">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              </button>
            </div>
          )}

          {/* Notlar Paneli */}
          <div className="flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-4 h-fit">
            <div className="mb-3 flex items-center justify-between gap-4">
              <h3 className="text-base font-semibold">Sayfa Notu</h3>
              <button
                type="button"
                onClick={handleSaveNotes}
                disabled={isSavingNotes}
                className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-[var(--accent-hover)] disabled:cursor-wait disabled:opacity-70"
              >
                {isSavingNotes ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </div>
            <textarea
              value={notes.page}
              onChange={handleNotesChangePage}
              rows={15}
              placeholder="Bu sayfa için alınacak notlar..."
              className="w-full resize-y rounded-xl border border-[var(--border)] bg-transparent p-3 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            />
          </div>

        </div>
      </div>

      {isViewerOpen && page?.image && (
        <ImageViewer
          title="Görseli Görüntüle"
          imagePath={page.image}
          timestamp={page?.updated_at ? new Date(page.updated_at).getTime() : null}
          onClose={closeViewer}
        />
      )}

      {isPendingDelete && (
        <ConfirmDialog
          title="Görseli Sil"
          message="Sayfa görseli kalıcı olarak silinecek. Devam etmek istiyor musun?"
          onCancel={cancelDelete}
          onConfirm={handleDeleteImage}
        />
      )}
    </section>
  )
}