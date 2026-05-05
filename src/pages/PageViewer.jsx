import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import useSettingsStore from '../store/useSettingsStore.js'
import { ipc } from '../utils/ipc.js'
import { toLocalAssetUrl } from '../utils/paths.js'
import ImageUploader from '../components/images/ImageUploader.jsx'
import ImageViewer from '../components/images/ImageViewer.jsx'
import ConfirmDialog from '../components/shared/ConfirmDialog.jsx'
import { useToast } from '../components/shared/ToastProvider.jsx'
import usePdfQueueStore from '../store/usePdfQueueStore.js'

const formatSideLabel = (side) =>
  side === 'A' ? 'Sol Taraf' : side === 'B' ? 'Sağ Taraf' : side

function PageImagePanel({
  sideLabel,
  imagePath,
  notesValue,
  placeholderLabel,
  notesPlaceholder,
  onNotesChange,
  onUpload,
  onDelete,
  onOpenViewer,
  onReveal,
  onFileDrop,
  onTogglePdf,
  isSelectedForPdf,
  storagePath,
}) {
  const imageUrl = toLocalAssetUrl(storagePath, imagePath)
  const [isDragging, setIsDragging] = useState(false)

  const handleDrop = async (event) => {
    event.preventDefault()
    setIsDragging(false)

    const droppedFile = event.dataTransfer.files?.[0]
    if (!droppedFile) {
      return
    }

    const filePath = ipc.systemGetPathForFile(droppedFile)
    if (!filePath) {
      return
    }

    await onFileDrop(filePath)
  }

  return (
    <div className="space-y-3">
      <h3 className="text-lg">{sideLabel}</h3>
      {imageUrl ? (
        <div
          onDragOver={(event) => {
            event.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`overflow-hidden rounded-2xl border bg-[rgba(255,255,255,0.02)] transition ${
            isDragging
              ? 'border-[var(--accent)] ring-2 ring-[rgba(79,142,247,0.22)]'
              : 'border-[var(--border)]'
          }`}
        >
          <button
            type="button"
            onClick={onOpenViewer}
            className="group relative block h-[22rem] w-full bg-[var(--bg-elevated)]"
          >
            <img
              src={imageUrl}
              alt={`${sideLabel} görseli`}
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
              className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                isSelectedForPdf
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
        </div>
      ) : (
        <div
          onDragOver={(event) => {
            event.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`rounded-2xl transition ${
            isDragging ? 'ring-2 ring-[rgba(79,142,247,0.22)]' : ''
          }`}
        >
          <ImageUploader label={placeholderLabel} onUpload={onUpload} />
        </div>
      )}
      <textarea
        value={notesValue}
        onChange={onNotesChange}
        rows={4}
        placeholder={notesPlaceholder}
        className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)]"
      />
    </div>
  )
}

export default function PageViewer() {
  const { pageId } = useParams()
  const navigate = useNavigate()
  const numericId = Number(pageId)
  const [page, setPage] = useState(null)
  const [notes, setNotes] = useState({ a: '', b: '', page: '' })
  const [viewerSide, setViewerSide] = useState(null)
  const [pendingDeleteSide, setPendingDeleteSide] = useState(null)
  const [isSavingNotes, setIsSavingNotes] = useState(false)
  const storagePath = useSettingsStore((state) => state.storagePath)
  const togglePdfItem = usePdfQueueStore((state) => state.toggleItem)
  const pdfItems = usePdfQueueStore((state) => state.items)
  const { showToast } = useToast()

  const syncPageState = useCallback((data) => {
    setPage(data)
    setNotes({
      a: data?.side_a_notes || '',
      b: data?.side_b_notes || '',
      page: data?.page_notes || '',
    })
  }, [])

  const loadPage = useCallback(async () => {
    const result = await ipc.pagesGetById(numericId)
    if (result.success) {
      syncPageState(result.data)
    }
    return result
  }, [numericId, syncPageState])

  useEffect(() => {
    if (!numericId) {
      return
    }

    let isMounted = true

    const fetchPage = async () => {
      const result = await ipc.pagesGetById(numericId)
      if (isMounted && result.success) {
        syncPageState(result.data)
      }
    }

    fetchPage()

    return () => {
      isMounted = false
    }
  }, [numericId, syncPageState])

  const runImageUpload = async (side, sourcePath = null) => {
    const result = sourcePath
      ? await ipc.imagesUpload(numericId, side, sourcePath)
      : await ipc.imagesUploadFromDialog(numericId, side)

    if (result.success) {
      await loadPage()
      const sideLabel = formatSideLabel(side)
      showToast({
        variant: 'success',
        title: 'Görsel güncellendi',
        message: `${sideLabel} görseli başarıyla kaydedildi.`,
      })
      return
    }

    if (result.error === 'Seçim iptal edildi.') {
      return
    }

    showToast({
      variant: 'danger',
      title: 'Görsel yüklenemedi',
      message: result.error || 'Görsel seçilirken beklenmeyen bir sorun oluştu.',
    })
  }

  const handleDeleteImage = async () => {
    if (!pendingDeleteSide) {
      return
    }

    const side = pendingDeleteSide
    const result = await ipc.imagesDelete(numericId, side)
    setPendingDeleteSide(null)

    if (result.success) {
      await loadPage()
      const sideLabel = formatSideLabel(side)
      showToast({
        variant: 'success',
        title: 'Görsel silindi',
        message: `${sideLabel} görseli kaldırıldı.`,
      })
      return
    }

    showToast({
      variant: 'danger',
      title: 'Görsel silinemedi',
      message: result.error || 'Görsel silinirken beklenmeyen bir hata oluştu.',
    })
  }

  const handleRevealImage = async (imagePath) => {
    if (!imagePath) {
      return
    }

    const result = await ipc.imagesRevealInFolder(imagePath)
    if (!result.success) {
      showToast({
        variant: 'danger',
        title: 'Klasör açılamadı',
        message: result.error || 'Görselin bulunduğu klasör açılamadı.',
      })
    }
  }

  const handleSaveNotes = async () => {
    setIsSavingNotes(true)

    const result = await ipc.pagesUpdate(numericId, {
      page_notes: notes.page,
      side_a_notes: notes.a,
      side_b_notes: notes.b,
    })

    setIsSavingNotes(false)

    if (result.success) {
      syncPageState(result.data)
      showToast({
        variant: 'success',
        title: 'Notlar kaydedildi',
        message: 'Notlar kaydedildi.',
      })
      return
    }

    showToast({
      variant: 'danger',
      title: 'Kayıt başarısız',
      message: result.error || 'Notlar kaydedilirken beklenmeyen bir hata oluştu.',
    })
  }

  const viewerImagePath =
    viewerSide === 'A'
      ? page?.side_a_image
      : viewerSide === 'B'
        ? page?.side_b_image
        : null

  return (
    <section className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          {page?.book_id ? (
            <button
              type="button"
              onClick={() => navigate(`/books/${page.book_id}`)}
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
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Sol ve sağ tarafları yan yana kontrol et.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <PageImagePanel
          sideLabel={formatSideLabel('A')}
          imagePath={page?.side_a_image}
          notesValue={notes.a}
          placeholderLabel="Sol Taraf Yükle"
          notesPlaceholder="Sol taraf notu"
          onNotesChange={(event) =>
            setNotes((prev) => ({ ...prev, a: event.target.value }))
          }
          onUpload={() => runImageUpload('A')}
          onDelete={() => setPendingDeleteSide('A')}
          onOpenViewer={() => setViewerSide('A')}
          onReveal={() => handleRevealImage(page?.side_a_image)}
          onFileDrop={(filePath) => runImageUpload('A', filePath)}
          onTogglePdf={() => {
            if (!page?.side_a_image) return

            togglePdfItem({
              pageId: numericId,
              side: 'A',
              imagePath: page.side_a_image,
              pageNumber: page.page_number,
              bookId: page.book_id,
              bookName: page.book_name || '',
            })
          }}
          isSelectedForPdf={pdfItems.some(
            (item) => item.pageId === numericId && item.side === 'A'
          )}
          storagePath={storagePath}
        />
        <PageImagePanel
          sideLabel={formatSideLabel('B')}
          imagePath={page?.side_b_image}
          notesValue={notes.b}
          placeholderLabel="Sağ Taraf Yükle"
          notesPlaceholder="Sağ taraf notu"
          onNotesChange={(event) =>
            setNotes((prev) => ({ ...prev, b: event.target.value }))
          }
          onUpload={() => runImageUpload('B')}
          onDelete={() => setPendingDeleteSide('B')}
          onOpenViewer={() => setViewerSide('B')}
          onReveal={() => handleRevealImage(page?.side_b_image)}
          onFileDrop={(filePath) => runImageUpload('B', filePath)}
          onTogglePdf={() => {
            if (!page?.side_b_image) return

            togglePdfItem({
              pageId: numericId,
              side: 'B',
              imagePath: page.side_b_image,
              pageNumber: page.page_number,
              bookId: page.book_id,
              bookName: page.book_name || '',
            })
          }}
          isSelectedForPdf={pdfItems.some(
            (item) => item.pageId === numericId && item.side === 'B'
          )}
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
            {isSavingNotes ? 'Kaydediliyor...' : 'Notları Kaydet'}
          </button>
        </div>
        <textarea
          value={notes.page}
          onChange={(event) =>
            setNotes((prev) => ({ ...prev, page: event.target.value }))
          }
          rows={4}
          placeholder="Sayfaya özel not"
          className="w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-sm text-[var(--text-primary)]"
        />
      </div>

      {viewerImagePath ? (
        <ImageViewer
          title={`${formatSideLabel(viewerSide)} Görüntüle`}
          imagePath={viewerImagePath}
          onClose={() => setViewerSide(null)}
        />
      ) : null}

      {pendingDeleteSide ? (
        <ConfirmDialog
          title="Görseli Sil"
          message={`${formatSideLabel(pendingDeleteSide)} görseli kalıcı olarak silinecek. Devam etmek istiyor musun?`}
          onCancel={() => setPendingDeleteSide(null)}
          onConfirm={handleDeleteImage}
        />
      ) : null}
    </section>
  )
}
