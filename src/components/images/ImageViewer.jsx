import { useState } from 'react'
import Modal from '../shared/Modal.jsx'
import ConfirmDialog from '../shared/ConfirmDialog.jsx'
import useSettingsStore from '../../store/useSettingsStore.js'
import { toLocalAssetUrl } from '../../utils/paths.js'
import { useImageZoom } from '../../hooks/useImageZoom.js'
import { ipc } from '../../utils/ipc.js'
import { useToast } from '../shared/ToastProvider.jsx'

export default function ImageViewer({ title, imagePath, timestamp, onClose, panelClassName = 'max-w-6xl' }) {
  const storagePath = useSettingsStore((state) => state.storagePath)
  const imageUrl = toLocalAssetUrl(storagePath, imagePath, timestamp)
  const { containerRef, scale, handleMouseDown, isDragging } = useImageZoom({
    maxScale: 6,
    zoomSpeed: 0.15,
    enablePan: true
  })
  const { showToast } = useToast()

  // 'idle' | 'downloading' | 'done'
  const [downloadState, setDownloadState] = useState('idle')
  const [downloadedPath, setDownloadedPath] = useState(null)
  const [conflictFileName, setConflictFileName] = useState(null)

  const doDownload = async (force = false) => {
    setDownloadState('downloading')
    const result = await ipc.imagesCopyToDesktop({ relativePath: imagePath, force })

    if (result.success) {
      setDownloadState('done')
      setDownloadedPath(result.destPath)
      showToast({
        variant: 'success',
        title: 'Masaüstüne indirildi',
        message: 'Resim masaüstünüze kaydedildi.',
      })
    } else if (result.conflict) {
      setDownloadState('idle')
      setConflictFileName(result.fileName)
    } else {
      setDownloadState('idle')
      showToast({
        variant: 'danger',
        title: 'İndirme başarısız',
        message: result.error || 'Resim indirilemedi.',
      })
    }
  }

  const handleDownload = () => {
    if (downloadState === 'downloading') return
    doDownload(false)
  }

  const handleConflictConfirm = () => {
    setConflictFileName(null)
    doDownload(true)
  }

  const handleOpen = async () => {
    if (!downloadedPath) return
    await ipc.imagesOpenFile(downloadedPath)
  }

  let cursorClass = 'cursor-zoom-in'
  if (isDragging) cursorClass = 'cursor-grabbing'
  else if (scale > 1.05) cursorClass = 'cursor-grab'

  // Download butonu — Modal headerActions slotuna geçirilecek
  const downloadAction = imagePath ? (
    downloadState === 'done' ? (
      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--success-border)] bg-[rgba(52,201,122,0.12)] px-3 py-1 text-xs font-semibold text-[var(--success)] transition hover:bg-[rgba(52,201,122,0.22)]"
      >
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
        Resmi Aç
      </button>
    ) : (
      <button
        type="button"
        onClick={handleDownload}
        disabled={downloadState === 'downloading'}
        className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1 text-xs font-semibold text-[var(--text-muted)] transition hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-60"
      >
        {downloadState === 'downloading' ? (
          <>
            <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            İndiriliyor...
          </>
        ) : (
          <>
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            İndir
          </>
        )}
      </button>
    )
  ) : null

  return (
    <>
      <Modal title={title} onClose={onClose} panelClassName={panelClassName} headerActions={downloadAction}>
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          className={`max-h-[88vh] overflow-auto rounded-xl border border-[var(--border)] bg-[rgba(255,255,255,0.02)] select-none ${cursorClass}`}
          title="Ctrl + Fare Tekerleği ile yakınlaştır, sürükleyerek kaydır"
        >
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={title}
              draggable={false}
              className="mx-auto h-auto block"
              style={{ width: `${scale * 100}%`, maxWidth: 'none' }}
            />
          ) : null}
        </div>
      </Modal>

      {conflictFileName && (
        <ConfirmDialog
          title="Dosya zaten mevcut"
          message={`Masaüstünüzde "${conflictFileName}" adında bir dosya zaten var. Yine de indirmek istiyor musunuz? Farklı bir ad ile kaydedilecek.`}
          confirmLabel="Yine de İndir"
          cancelLabel="İptal"
          variant="warning"
          onConfirm={handleConflictConfirm}
          onCancel={() => setConflictFileName(null)}
        />
      )}
    </>
  )
}
