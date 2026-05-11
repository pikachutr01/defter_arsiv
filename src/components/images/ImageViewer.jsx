import { useState, useMemo, useEffect, useCallback } from 'react'
import Modal from '../shared/Modal.jsx'
import ConfirmDialog from '../shared/ConfirmDialog.jsx'
import useSettingsStore from '../../store/useSettingsStore.js'
import { toLocalAssetUrl } from '../../utils/paths.js'
import { useImageZoom } from '../../hooks/useImageZoom.js'
import { ipc } from '../../utils/ipc.js'
import { useToast } from '../shared/ToastProvider.jsx'

export default function ImageViewer({ title, imagePath, timestamp, onClose, panelClassName = 'max-w-6xl', pages, currentPage, onNavigate }) {
  const storagePath = useSettingsStore((state) => state.storagePath)
  const imageUrl = toLocalAssetUrl(storagePath, imagePath, timestamp)
  const { containerRef, scale, handleMouseDown, isDragging, resetZoom } = useImageZoom({
    maxScale: 6,
    zoomSpeed: 0.15,
    enablePan: true
  })
  const { showToast } = useToast()

  // 'idle' | 'downloading' | 'done'
  const [downloadState, setDownloadState] = useState('idle')
  const [downloadedPath, setDownloadedPath] = useState(null)
  const [conflictFileName, setConflictFileName] = useState(null)

  // ── Navigasyon hesaplamaları ───────────────────────────────────────────────
  const canNavigate = Boolean(pages && currentPage && onNavigate)

  const currentIndex = useMemo(() => {
    if (!canNavigate) return -1
    return pages.findIndex((p) => p.id === currentPage.id)
  }, [canNavigate, pages, currentPage])

  // Önceki resimli sayfa indeksi (geriye doğru ilk is_uploaded olan)
  const prevIndex = useMemo(() => {
    if (currentIndex <= 0) return -1
    for (let i = currentIndex - 1; i >= 0; i--) {
      if (pages[i].is_uploaded === 1 && pages[i].image) return i
    }
    return -1
  }, [pages, currentIndex])

  // Sonraki resimli sayfa indeksi (ileriye doğru ilk is_uploaded olan)
  const nextIndex = useMemo(() => {
    if (!canNavigate || currentIndex === -1 || currentIndex >= pages.length - 1) return -1
    for (let i = currentIndex + 1; i < pages.length; i++) {
      if (pages[i].is_uploaded === 1 && pages[i].image) return i
    }
    return -1
  }, [canNavigate, pages, currentIndex])

  const hasPrev = prevIndex !== -1
  const hasNext = nextIndex !== -1

  const goToPrev = useCallback(() => {
    if (!hasPrev) return
    setDownloadState('idle')
    setDownloadedPath(null)
    if (resetZoom) resetZoom()
    onNavigate(pages[prevIndex])
  }, [hasPrev, pages, prevIndex, onNavigate, resetZoom])

  const goToNext = useCallback(() => {
    if (!hasNext) return
    setDownloadState('idle')
    setDownloadedPath(null)
    if (resetZoom) resetZoom()
    onNavigate(pages[nextIndex])
  }, [hasNext, pages, nextIndex, onNavigate, resetZoom])

  // Klavye ok tuşları ile navigasyon
  useEffect(() => {
    if (!canNavigate) return
    const handleKey = (e) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); goToPrev() }
      if (e.key === 'ArrowRight') { e.preventDefault(); goToNext() }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [canNavigate, goToPrev, goToNext])

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

  // Header actions: navigasyon okları + indirme butonu
  const navBtnBase = 'inline-flex items-center justify-center rounded-lg border px-2 py-1 transition'
  const navBtnEnabled = `${navBtnBase} border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]`
  const navBtnDisabled = `${navBtnBase} border-[var(--border)] text-[var(--text-muted)] opacity-30 cursor-not-allowed`

  const headerActions = (
    <>
      {canNavigate && (
        <div className="inline-flex items-center gap-1 mr-1">
          <button
            type="button"
            onClick={goToPrev}
            disabled={!hasPrev}
            className={hasPrev ? navBtnEnabled : navBtnDisabled}
            title="Önceki resim"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <button
            type="button"
            onClick={goToNext}
            disabled={!hasNext}
            className={hasNext ? navBtnEnabled : navBtnDisabled}
            title="Sonraki resim"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      )}

      {imagePath ? (
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
      ) : null}
    </>
  )

  return (
    <>
      <Modal title={title} onClose={onClose} panelClassName={panelClassName} headerActions={headerActions}>
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
