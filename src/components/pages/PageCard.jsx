import { useMemo, useState, useCallback, useRef } from 'react'
import { ipc } from '../../utils/ipc.js'
import { toLocalAssetUrl } from '../../utils/paths.js'
import useSettingsStore from '../../store/useSettingsStore.js'

function Tooltip({ label, children }) {
  return (
    <div className="group relative flex items-center justify-center">
      {children}
      {label && (
        <div className="pointer-events-none absolute bottom-full left-1/2 z-[100] mb-2 -translate-x-1/2 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-xs text-[var(--text-primary)] opacity-0 shadow-[var(--shadow-soft)] transition-opacity duration-150 group-hover:opacity-100 w-max max-w-sm">
          <div className="max-h-40 overflow-y-auto whitespace-pre-wrap break-words">{label}</div>
          <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-[var(--border)]" />
        </div>
      )}
    </div>
  )
}

function useDragDrop(onFileDrop) {
  const [isDragging, setIsDragging] = useState(false)
  // dragenter/dragleave iç içe elementlerde art arda tetiklenir; sayaç ile
  // gerçek container girişi/çıkışını ayırt ediyoruz.
  const dragCounterRef = useRef(0)

  const handleDragEnter = useCallback((e) => {
    e.preventDefault()
    dragCounterRef.current += 1
    if (dragCounterRef.current === 1) setIsDragging(true)
  }, [])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
  }, [])

  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    dragCounterRef.current -= 1
    if (dragCounterRef.current === 0) setIsDragging(false)
  }, [])

  const handleDrop = useCallback(async (e) => {
    e.preventDefault()
    dragCounterRef.current = 0
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (!file) return
    const filePath = ipc.systemGetPathForFile(file)
    if (!filePath) return
    await onFileDrop(filePath)
  }, [onFileDrop])

  return { isDragging, handleDragEnter, handleDragOver, handleDragLeave, handleDrop }
}

const getPageStateAppearance = (isUploaded) => {
  if (isUploaded) {
    return {
      className: 'border-[var(--success)] hover:border-[var(--success)]',
      style: { boxShadow: '0 0 0 2px color-mix(in srgb, var(--success) 26%, transparent), var(--shadow-card)' },
    }
  }
  return {
    className: 'border-[var(--neutral-border)] hover:border-[var(--neutral-border)]',
    style: { boxShadow: '0 0 0 1px color-mix(in srgb, var(--neutral-border) 55%, transparent), var(--shadow-card)' },
  }
}

export default function PageCard({
  page,
  onViewImage,
  onUpload,
  onDelete,
  onRotate,
  onTogglePdf,
  onReveal,
  onEditNote,
  isPdfSelected,
  isUploading,
}) {
  const isUploaded = page.is_uploaded === 1
  const storagePath = useSettingsStore((state) => state.storagePath)

  const note = useMemo(() => String(page.page_notes ?? '').trim(), [page.page_notes])

  const appearance = useMemo(() => getPageStateAppearance(isUploaded), [isUploaded])

  const imageUrl = useMemo(() => {
    if (!page.image) return null
    const timeParam = page.updated_at ? new Date(page.updated_at).getTime() : null
    return toLocalAssetUrl(storagePath, page.image, timeParam)
  }, [storagePath, page.image, page.updated_at])

  const handleFileDrop = useCallback((filePath) => {
    if (onUpload) onUpload(page.id, filePath)
  }, [onUpload, page.id])

  const { isDragging, handleDragEnter, handleDragOver, handleDragLeave, handleDrop } = useDragDrop(handleFileDrop)

  return (
    <div
      style={appearance.style}
      className={`relative flex h-[350px] w-full flex-col rounded-2xl border bg-[var(--bg-card)] transition ${isUploading ? 'pointer-events-none' : ''} ${appearance.className}`}
    >
      {/* Upload progress overlay */}
      {isUploading && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-2xl bg-[var(--bg-card)]/80 backdrop-blur-sm">
          <svg className="animate-spin h-10 w-10 text-[var(--accent)]" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          <span className="mt-3 text-xs font-semibold text-[var(--text-muted)]">Yükleniyor...</span>
        </div>
      )}
      {/* Upper Area: Image Preview & Drag-Drop */}
      <div
        className="relative flex-1 bg-[var(--bg-elevated)] flex flex-col items-center justify-center overflow-hidden rounded-t-[calc(1rem-1px)]"
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isDragging && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--accent)]/10 backdrop-blur-sm border-2 border-dashed border-[var(--accent)] m-2 rounded-xl transition-all">
            <span className="text-[var(--accent)] font-semibold">Resmi Buraya Bırak</span>
          </div>
        )}

        {imageUrl ? (
          <button
            type="button"
            className="w-full h-full group"
            onClick={() => onViewImage && onViewImage(page)}
          >
            <img
              src={imageUrl}
              alt={`Sayfa ${page.page_number}`}
              className="w-full h-full object-contain p-2 transition duration-300 group-hover:scale-[1.02]"
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center bg-gradient-to-t from-[rgba(7,11,18,0.85)] via-[rgba(7,11,18,0.1)] to-transparent p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              <span className="rounded-full bg-black/40 px-3 py-1.5 text-xs text-white backdrop-blur-md">
                Tam Boyut Görüntüle
              </span>
            </div>
          </button>
        ) : (
          <div className="flex flex-col items-center justify-center text-[var(--text-muted)] gap-2 opacity-60 pointer-events-none">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <span className="text-sm font-medium">Resim eklenmedi</span>
            <span className="text-xs">Sürükleyip bırakın</span>
          </div>
        )}

        {/* Page Number Badge */}
        <div className="absolute top-3 left-3 flex items-center justify-center rounded-full bg-[var(--bg-card)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--success)] shadow-md border border-[var(--success)]/30">
          Sayfa {page.page_number}
        </div>
      </div>

      {/* Bottom Area: Toolbar */}
      <div className="flex items-center justify-between border-t border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 rounded-b-[calc(1rem-1px)]">
        <div className="flex items-center gap-1">
          {isUploaded && (
            <>
              <Tooltip label={isPdfSelected ? "PDF'den Çıkar" : "PDF'e Ekle"}>
                <button
                  type="button"
                  onClick={() => onTogglePdf && onTogglePdf(page)}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all ${isPdfSelected
                    ? 'bg-[var(--accent)] text-white shadow-md shadow-[var(--accent)]/20'
                    : 'bg-transparent text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--accent)]'
                    }`}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    {isPdfSelected ? (
                      <line x1="9" y1="15" x2="15" y2="15" />
                    ) : (
                      <>
                        <line x1="12" y1="12" x2="12" y2="18" />
                        <line x1="9" y1="15" x2="15" y2="15" />
                      </>
                    )}
                  </svg>
                </button>
              </Tooltip>

              <div className="mx-1 h-4 w-px bg-[var(--border)]" />
            </>
          )}

          <Tooltip label="Resmi Değiştir">
            <button type="button" onClick={() => onUpload && onUpload(page.id)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-primary)] transition hover:bg-[var(--bg-elevated)] hover:text-[var(--accent)]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </button>
          </Tooltip>

          {isUploaded && (
            <>
              <Tooltip label="Sola Döndür">
                <button type="button" onClick={() => onRotate && onRotate(page.id)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-primary)] transition hover:bg-[var(--bg-elevated)] hover:text-[var(--accent)]">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                    <path d="M3 3v5h5" />
                  </svg>
                </button>
              </Tooltip>

              <Tooltip label="Klasörde Bul">
                <button type="button" onClick={() => onReveal && onReveal(page.image)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-primary)] transition hover:bg-[var(--bg-elevated)] hover:text-[var(--accent)]">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                  </svg>
                </button>
              </Tooltip>
            </>
          )}
        </div>

        <div className="flex items-center gap-1">
          <Tooltip label={note ? `Not: ${note}` : null}>
            <button type="button" onClick={() => onEditNote && onEditNote(page)}
              className={`flex h-8 w-8 items-center justify-center rounded-lg transition hover:bg-[var(--bg-elevated)] hover:text-[var(--accent)] ${note ? 'text-[var(--accent)]' : 'text-[var(--text-primary)]'}`}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
          </Tooltip>

          {isUploaded && (
            <Tooltip label="Resmi Sil">
              <button type="button" onClick={() => onDelete && onDelete(page.id)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--danger-text)] transition hover:bg-[var(--danger-surface-soft)]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            </Tooltip>
          )}
        </div>
      </div>
    </div>
  )
}