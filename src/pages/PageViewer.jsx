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
  onUpload,
  onRotate,
  onDelete,
  onOpenViewer,
  onReveal,
  onFileDrop,
  onTogglePdf,
  isSelectedForPdf,
  storagePath,
}) {
  const timeParam = updatedAt ? new Date(updatedAt).getTime() : null
  const imageUrl = toLocalAssetUrl(storagePath, imagePath, timeParam)
  const { isDragging, handleDragOver, handleDragLeave, handleDrop } = useDragDrop(onFileDrop)

  return (
    <div className="space-y-3">
      <h3 className="text-lg">Sayfa Görseli</h3>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`overflow-hidden rounded-2xl border transition ${isDragging
          ? 'border-[var(--accent)] ring-2 ring-[rgba(79,142,247,0.22)]'
          : 'border-[var(--border)]'
          } bg-[rgba(255,255,255,0.02)]`}
      >
        {imageUrl ? (
          <>
            <button
              type="button"
              onClick={onOpenViewer}
              className="group relative block h-[22rem] w-full bg-[var(--bg-elevated)]"
            >
              <img
                src={imageUrl}
                alt="Sayfa görseli"
                className="h-full w-full object-contain transition duration-300 group-hover:scale-[1.01]"
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-[rgba(7,11,18,0.92)] via-[rgba(7,11,18,0.28)] to-transparent px-4 py-3 text-xs text-white/85">
                <span>Görseli büyüt</span>
                <span className="rounded-full border border-white/20 px-2 py-1 text-[11px]">
                  Önizleme
                </span>
              </div>
            </button>
            <div className="flex flex-wrap gap-2 border-t border-[var(--border)] px-4 py-3">
              <button
                type="button"
                onClick={onTogglePdf}
                className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${isSelectedForPdf
                  ? 'border border-[var(--accent)] bg-[var(--accent)] text-white shadow-[0_12px_24px_rgba(54,111,224,0.28)]'
                  : 'border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-primary)] hover:border-[var(--accent)]'
                  }`}
              >
                {isSelectedForPdf ? "PDF'den Çıkar" : "PDF'e Ekle"}
              </button>
              <button
                type="button"
                onClick={onUpload}
                className="rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[var(--accent-hover)]"
              >
                Resmi Değiştir
              </button>
              <button
                type="button"
                onClick={onRotate}
                className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] transition hover:border-[var(--accent)]"
              >
                Sola Döndür
              </button>
              <button
                type="button"
                onClick={onReveal}
                className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] transition hover:border-[var(--accent)]"
              >
                Klasörde Bul
              </button>
              <button
                type="button"
                onClick={onDelete}
                className="rounded-lg border border-[var(--danger-border)] bg-[var(--danger-surface-soft)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] transition hover:border-[var(--danger-strong)]"
              >
                Resmi Sil
              </button>
            </div>
          </>
        ) : (
          <div className={`transition ${isDragging ? 'opacity-70' : ''}`}>
            <ImageUploader label="Görsel Yükle" onUpload={onUpload} />
          </div>
        )}
      </div>
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
      showToast({ variant: 'success', title: 'Notlar kaydedildi', message: 'Notlar kaydedildi.' })
      return
    }
    showToast({
      variant: 'danger',
      title: 'Kayıt başarısız',
      message: result.error || 'Notlar kaydedilirken beklenmeyen bir hata oluştu.',
    })
  }, [numericId, notes, syncPageState, showToast])

  const handleNotesChangePage = useCallback(
    (event) => setNotes({ page: event.target.value }),
    []
  )

  const handleUpload = useCallback(() => runImageUpload(), [runImageUpload])
  const handleRotate = useCallback(async () => {
    const result = await ipc.imagesRotate(numericId)
    if (result.success) {
      await loadPage()
      showToast({
        variant: 'success',
        title: 'Görsel döndürüldü',
        message: 'Resim başarıyla 90 derece sola döndürüldü.',
      })
    } else {
      showToast({
        variant: 'danger',
        title: 'Döndürme başarısız',
        message: result.error || 'Resim döndürülürken bir hata oluştu.',
      })
    }
  }, [numericId, loadPage, showToast])

  const handleDelete = useCallback(() => setIsPendingDelete(true), [])
  const handleOpenViewer = useCallback(() => setIsViewerOpen(true), [])
  const handleReveal = useCallback(
    () => handleRevealImage(page ? page.image : null),
    [handleRevealImage, page]
  )
  const handleFileDrop = useCallback(
    (filePath) => runImageUpload(filePath),
    [runImageUpload]
  )
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
    <section className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          {page?.book_id ? (
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
          ) : null}
          <h2 className="text-2xl">
            Sayfa Görüntüle {page?.page_number ? `#${page.page_number}` : ''}
          </h2>
        </div>
      </div>

      <div className="grid gap-6">
        <PageImagePanel
          imagePath={page?.image}
          updatedAt={page?.updated_at}
          onUpload={handleUpload}
          onRotate={handleRotate}
          onDelete={handleDelete}
          onOpenViewer={handleOpenViewer}
          onReveal={handleReveal}
          onFileDrop={handleFileDrop}
          onTogglePdf={handleTogglePdf}
          isSelectedForPdf={isSelectedForPdf}
          storagePath={storagePath}
        />
      </div>

      <div className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-lg">Sayfa Notu</h3>
          <button
            type="button"
            onClick={handleSaveNotes}
            disabled={isSavingNotes}
            className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)] disabled:cursor-wait disabled:opacity-70"
          >
            {isSavingNotes ? 'Kaydediliyor...' : 'Notu Kaydet'}
          </button>
        </div>
        <textarea
          value={notes.page}
          onChange={handleNotesChangePage}
          rows={6}
          placeholder="Sayfaya özel not"
          className="w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-sm text-[var(--text-primary)]"
        />
      </div>

      {isViewerOpen && page?.image ? (
        <ImageViewer
          title="Görseli Görüntüle"
          imagePath={page.image}
          timestamp={page?.updated_at ? new Date(page.updated_at).getTime() : null}
          onClose={closeViewer}
        />
      ) : null}

      {isPendingDelete ? (
        <ConfirmDialog
          title="Görseli Sil"
          message="Sayfa görseli kalıcı olarak silinecek. Devam etmek istiyor musun?"
          onCancel={cancelDelete}
          onConfirm={handleDeleteImage}
        />
      ) : null}
    </section>
  )
}