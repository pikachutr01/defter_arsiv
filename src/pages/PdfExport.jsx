import { useCallback, useMemo, useState } from 'react'
import Modal from '../components/shared/Modal.jsx'
import EmptyState from '../components/shared/EmptyState.jsx'
import ImageViewer from '../components/images/ImageViewer.jsx'
import AnnotationCanvas from '../components/images/AnnotationCanvas.jsx'
import { useToast } from '../components/shared/ToastProvider.jsx'
import usePdfQueueStore from '../store/usePdfQueueStore.js'
import useSettingsStore from '../store/useSettingsStore.js'
import { ipc } from '../utils/ipc.js'
import { toLocalAssetUrl } from '../utils/paths.js'

const formatDate = (value) =>
  new Intl.DateTimeFormat('tr-TR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))

const formatFileSize = (bytes) => {
  if (!bytes) {
    return '0 KB'
  }

  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let index = 0

  while (size >= 1024 && index < units.length - 1) {
    size /= 1024
    index += 1
  }

  return `${size.toFixed(size >= 10 || index === 0 ? 0 : 1)} ${units[index]}`
}

const formatSideLabel = (side) =>
  side === 'A' ? 'Sol Taraf' : side === 'B' ? 'Sağ Taraf' : side

function PdfFileNameDialog({ value, onChange, onClose, onConfirm, isSaving, clearQueue, onToggleClearQueue }) {
  return (
    <Modal title="PDF Adı" onClose={onClose} panelClassName="max-w-xl">
      <div className="space-y-4">
        <p className="text-sm text-[var(--text-muted)]">
          PDF dosyasına verilecek adı yaz. Dosya hem arşiv klasörüne hem de
          İndirilenler klasörüne kaydedilecek.
        </p>
        <input
          autoFocus
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Örnek: 1915-Defter-1-Seçili-Sayfalar"
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
        />
        {/* Switch: oluşturulunca kuyruğu temizle */}
        <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3">
          <span className="text-sm text-[var(--text-primary)]">
            Oluşturulunca aktif resimleri kaldır
          </span>
          <button
            type="button"
            onClick={onToggleClearQueue}
            role="switch"
            aria-checked={clearQueue}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 transition-colors duration-200 ${
              clearQueue
                ? 'border-[var(--accent)] bg-[var(--accent)]'
                : 'border-[var(--border)] bg-[var(--bg-card)]'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${
                clearQueue ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </label>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm text-[var(--text-primary)] transition hover:border-[var(--accent)]"
          >
            Vazgeç
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSaving}
            className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)] disabled:cursor-wait disabled:opacity-70"
          >
            {isSaving ? 'Oluşturuluyor...' : 'PDF Oluştur'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

function PdfQueueCard({
  item,
  index,
  storagePath,
  onOpenViewer,
  onRemove,
  onNoteChange,
  onDragStart,
  onDragOver,
  onDrop,
  isDragging,
  onAnnotate,
}) {
  const imageUrl = item.annotatedDataUrl
    ? item.annotatedDataUrl
    : toLocalAssetUrl(storagePath, item.imagePath)

  return (
    <article
      draggable
      onDragStart={() => onDragStart(index)}
      onDragOver={(event) => onDragOver(event, index)}
      onDrop={() => onDrop(index)}
      onDragEnd={() => onDrop(index, true)}
      className={`rounded-2xl border bg-[var(--bg-card)] p-3 shadow-[var(--shadow-card)] transition ${
        isDragging
          ? 'scale-[0.985] border-[var(--accent)] opacity-80'
          : 'border-[var(--border)]'
      }`}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-[var(--text-primary)]">
            {item.bookName || 'Adsız Cilt'}
          </p>
          <p className="text-[11px] text-[var(--text-muted)]">
            Sayfa {item.pageNumber} • {formatSideLabel(item.side)}
            {item.annotatedDataUrl ? (
              <span className="ml-1.5 rounded-full bg-[var(--accent-dim)] px-1.5 py-0.5 text-[10px] text-[var(--accent)]">
                çizimli
              </span>
            ) : null}
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={onAnnotate}
            className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-muted)] transition hover:border-[var(--accent)] hover:text-[var(--text-primary)]"
          >
            ✏️
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="rounded-lg border border-[var(--danger-border)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-primary)] transition hover:border-[var(--danger-strong)]"
          >
            Çıkar
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={onOpenViewer}
        className="group block h-36 w-full overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)]"
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={`${item.bookName} ${item.pageNumber} ${formatSideLabel(item.side)}`}
            className="h-full w-full object-contain transition duration-300 group-hover:scale-[1.01]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-[var(--text-muted)]">
            Önizleme yüklenemedi
          </div>
        )}
      </button>

      <textarea
        value={item.note || ''}
        onChange={(event) => onNoteChange(event.target.value)}
        rows={2}
        placeholder="PDF notu"
        className="mt-2 w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-xs text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
      />
      <p className="mt-1 text-[11px] text-[var(--text-muted)]">
        Kartı sürükleyerek sırayı değiştir.
      </p>
    </article>
  )
}

function PdfSavedCard({ item, onOpen, onDelete }) {
  return (
    <article className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--bg-elevated)] text-[var(--accent)]">
          <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none">
            <path
              d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7l-5-5Z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M14 2v5h5M8.5 14.5h7M8.5 18h5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-[var(--text-primary)]">
            {item.name}
          </h3>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            {formatDate(item.updatedAt)}
          </p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            {formatFileSize(item.size)}
          </p>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={onOpen}
          className="flex-1 rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
        >
          Aç
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="rounded-xl border border-[var(--danger-border)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] transition hover:border-[var(--danger-strong)]"
        >
          Sil
        </button>
      </div>
    </article>
  )
}

export default function PdfExport() {
  const items = usePdfQueueStore((state) => state.items)
  const updateItemNote = usePdfQueueStore((state) => state.updateItemNote)
  const updateItemAnnotation = usePdfQueueStore((state) => state.updateItemAnnotation)
  const removeItem = usePdfQueueStore((state) => state.removeItem)
  const reorderItems = usePdfQueueStore((state) => state.reorderItems)
  const clearItems = usePdfQueueStore((state) => state.clearItems)
  const storagePath = useSettingsStore((state) => state.storagePath)
  const [activeTab, setActiveTab] = useState('create')
  const [savedPdfs, setSavedPdfs] = useState([])
  const [isLoadingPdfs, setIsLoadingPdfs] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [viewerItem, setViewerItem] = useState(null)
  const [annotatingItem, setAnnotatingItem] = useState(null)
  const [dragIndex, setDragIndex] = useState(null)
  const [dropIndex, setDropIndex] = useState(null)
  const [isNameDialogOpen, setIsNameDialogOpen] = useState(false)
  const [pdfFileName, setPdfFileName] = useState('')
  const [clearQueueOnSuccess, setClearQueueOnSuccess] = useState(false)
  const [pendingDeletePdf, setPendingDeletePdf] = useState(null)
  const { showToast } = useToast()

  const queueCountLabel = useMemo(() => `${items.length} görsel seçildi`, [items.length])

  const loadSavedPdfs = useCallback(async () => {
    setIsLoadingPdfs(true)
    const result = await ipc.pdfList()
    setIsLoadingPdfs(false)

    if (result.success) {
      setSavedPdfs(result.data)
      return true
    }

    showToast({
      variant: 'danger',
      title: 'PDF listesi alınamadı',
      message: result.error || 'Kayıtlı PDF dosyaları yüklenemedi.',
    })

    return false
  }, [showToast])

  const handleTabChange = async (tab) => {
    setActiveTab(tab)
    if (tab === 'saved') {
      await loadSavedPdfs()
    }
  }

  const handleGenerate = async () => {
    const trimmedFileName = pdfFileName.trim()
    if (!trimmedFileName) {
      showToast({
        variant: 'danger',
        title: 'PDF adı gerekli',
        message: 'Lütfen PDF için bir dosya adı yaz.',
      })
      return
    }

    setIsSaving(true)
    const result = await ipc.pdfGenerate({
      fileName: trimmedFileName,
      selections: items,
    })
    setIsSaving(false)

    if (result.success) {
      setIsNameDialogOpen(false)
      if (clearQueueOnSuccess) {
        clearItems()
      }
      await handleTabChange('saved')
      showToast({
        variant: 'success',
        title: 'PDF oluşturuldu',
        message: `${result.data.fileName} kaydedildi ve İndirilenler klasörüne kopyalandı.`,
      })
      return
    }

    showToast({
      variant: 'danger',
      title: 'PDF oluşturulamadı',
      message: result.error || 'PDF hazırlanırken beklenmeyen bir hata oluştu.',
    })
  }

  const handleOpenPdf = async (filePath) => {
    const result = await ipc.pdfOpen(filePath)
    if (!result.success) {
      showToast({
        variant: 'danger',
        title: 'PDF açılamadı',
        message: result.error || 'PDF varsayılan uygulamada açılamadı.',
      })
    }
  }

  const handleDeletePdf = async () => {
    if (!pendingDeletePdf) return
    const result = await ipc.pdfDelete(pendingDeletePdf.filePath)
    setPendingDeletePdf(null)
    if (result.success) {
      setSavedPdfs((prev) => prev.filter((p) => p.filePath !== pendingDeletePdf.filePath))
      showToast({ variant: 'success', title: 'PDF silindi', message: `${pendingDeletePdf.name} silindi.` })
    } else {
      showToast({ variant: 'danger', title: 'Silinemedi', message: result.error || 'PDF silinemedi.' })
    }
  }

  const openNameDialog = () => {
    const defaultName =
      pdfFileName.trim() || `secili-sayfalar-${new Date().toISOString().slice(0, 10)}`
    setPdfFileName(defaultName)
    setIsNameDialogOpen(true)
  }

  const handleDragOver = (event, index) => {
    event.preventDefault()
    setDropIndex(index)
  }

  const handleDrop = (index, resetOnly = false) => {
    if (!resetOnly && dragIndex !== null && dragIndex !== index) {
      reorderItems(dragIndex, index)
    }

    setDragIndex(null)
    setDropIndex(null)
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl">PDF Derleme</h2>
          <p className="text-sm text-[var(--text-muted)]">
            Ciltlerden seçtiğin görselleri sıraya koy, not ekle ve tek PDF olarak
            üret.
          </p>
        </div>
        <div className="rounded-full border border-[var(--border)] bg-[var(--bg-card)] px-4 py-2 text-sm text-[var(--text-muted)]">
          {queueCountLabel}
        </div>
      </div>

      <div className="inline-flex rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-1">
        <button
          type="button"
          onClick={() => handleTabChange('create')}
          className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
            activeTab === 'create'
              ? 'bg-[var(--accent)] text-white'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          Oluştur
        </button>
        <button
          type="button"
          onClick={() => handleTabChange('saved')}
          className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
            activeTab === 'saved'
              ? 'bg-[var(--accent)] text-white'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          Kayıtlı PDF&apos;ler
        </button>
      </div>

      {activeTab === 'create' ? (
        items.length === 0 ? (
          <EmptyState
            title="Henüz seçim yok"
            description="Sayfa görüntüleme ekranındaki PDF'e Ekle düğmesiyle görselleri bu kuyruğa ekleyebilirsin."
          />
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {items.map((item, index) => (
                <PdfQueueCard
                  key={`${item.pageId}-${item.side}`}
                  item={item}
                  index={index}
                  storagePath={storagePath}
                  onOpenViewer={() => setViewerItem(item)}
                  onRemove={() => removeItem(item.pageId, item.side)}
                  onNoteChange={(note) => updateItemNote(item.pageId, item.side, note)}
                  onAnnotate={() => setAnnotatingItem(item)}
                  onDragStart={setDragIndex}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  isDragging={dragIndex === index || dropIndex === index}
                />
              ))}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={openNameDialog}
                className="rounded-xl bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)]"
              >
                PDF Oluştur
              </button>
            </div>
          </>
        )
      ) : isLoadingPdfs ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-8 text-sm text-[var(--text-muted)]">
          PDF listesi yükleniyor...
        </div>
      ) : savedPdfs.length === 0 ? (
        <EmptyState
          title="Kayıtlı PDF yok"
          description="Oluşturduğun PDF dosyaları burada listelenecek."
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {savedPdfs.map((item) => (
            <PdfSavedCard
              key={item.id}
              item={item}
              onOpen={() => handleOpenPdf(item.filePath)}
              onDelete={() => setPendingDeletePdf(item)}
            />
          ))}
        </div>
      )}

      {viewerItem ? (
        <ImageViewer
          title={`${viewerItem.bookName} - Sayfa ${viewerItem.pageNumber} - ${formatSideLabel(viewerItem.side)}`}
          imagePath={viewerItem.imagePath}
          onClose={() => setViewerItem(null)}
          panelClassName="max-w-[85vw] w-full"
        />
      ) : null}

      {isNameDialogOpen ? (
        <PdfFileNameDialog
          value={pdfFileName}
          onChange={setPdfFileName}
          onClose={() => setIsNameDialogOpen(false)}
          onConfirm={handleGenerate}
          isSaving={isSaving}
          clearQueue={clearQueueOnSuccess}
          onToggleClearQueue={() => setClearQueueOnSuccess((v) => !v)}
        />
      ) : null}

      {annotatingItem ? (
        <AnnotationCanvas
          item={annotatingItem}
          onClose={() => setAnnotatingItem(null)}
          onSave={(dataUrl) =>
            updateItemAnnotation(annotatingItem.pageId, annotatingItem.side, dataUrl)
          }
        />
      ) : null}

      {pendingDeletePdf ? (
        <Modal title="PDF Sil" onClose={() => setPendingDeletePdf(null)} panelClassName="max-w-xl">
          <div className="rounded-2xl border border-[var(--danger-border)] bg-[var(--danger-surface)] px-4 py-4">
            <p className="text-sm font-semibold text-[var(--text-primary)]">Bu işlem geri alınamaz.</p>
            <p className="mt-2 text-sm text-[var(--text-primary)]/82">
              <span className="font-semibold">{pendingDeletePdf.name}</span> kalıcı olarak silinecek.
            </p>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setPendingDeletePdf(null)}
              className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-[var(--text-muted)] transition hover:border-[var(--accent)]"
            >
              Vazgeç
            </button>
            <button
              type="button"
              onClick={handleDeletePdf}
              className="rounded-lg border border-[var(--danger-border)] bg-[var(--danger)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--danger-strong)]"
            >
              Sil
            </button>
          </div>
        </Modal>
      ) : null}
    </section>
  )
}