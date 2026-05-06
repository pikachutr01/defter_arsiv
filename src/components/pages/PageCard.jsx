import { useMemo } from 'react'
import usePdfQueueStore from '../../store/usePdfQueueStore.js'

const SideBadge = ({ uploaded, label, onViewImage }) => (
  <div
    className={`flex items-center justify-between rounded-lg border px-3 py-2 text-xs ${
      uploaded
        ? 'border-[var(--accent)] text-[var(--text-primary)]'
        : 'border-[var(--border)] text-[var(--text-muted)]'
    }`}
  >
    <span>{label}</span>
    <div className="flex items-center gap-2">
      <span>{uploaded ? '✓' : '—'}</span>
      {uploaded && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            if (onViewImage) onViewImage()
          }}
          className="rounded p-1 hover:bg-[var(--accent-hover)] transition text-[var(--text-primary)]"
          title="Resmi Görüntüle"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
        </button>
      )}
    </div>
  </div>
)

const getPageStateAppearance = (page) => {
  const isUploaded = page.is_uploaded === 1

  if (isUploaded) {
    return {
      className: 'border-[var(--success)] hover:border-[var(--success)]',
      style: {
        boxShadow:
          '0 0 0 2px color-mix(in srgb, var(--success) 26%, transparent), var(--shadow-card)',
      },
    }
  }

  return {
    className: 'border-[var(--neutral-border)] hover:border-[var(--neutral-border)]',
    style: {
      boxShadow:
        '0 0 0 1px color-mix(in srgb, var(--neutral-border) 55%, transparent), var(--shadow-card)',
    },
  }
}

export default function PageCard({ page, onSelect, onViewImage }) {
  const appearance = getPageStateAppearance(page)
  const items = usePdfQueueStore((state) => state.items)
  const isPdfSelected = useMemo(() => items.some(item => item.pageId === page.id), [items, page.id])

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(page)}
      onKeyDown={(e) => e.key === 'Enter' && onSelect(page)}
      style={appearance.style}
      className={`relative flex h-full w-full flex-col gap-3 rounded-2xl border bg-[var(--bg-card)] p-4 text-left transition cursor-pointer ${appearance.className}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
          Sayfa {page.page_number}
        </span>
        {isPdfSelected && (
          <div className="absolute right-3 top-3 text-[var(--danger)]" title="PDF Kuyruğunda">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <path d="M14 2v6h6" />
              <path d="M16 13H8" />
              <path d="M16 17H8" />
              <path d="M10 9H8" />
            </svg>
          </div>
        )}
      </div>
      <SideBadge uploaded={page.is_uploaded === 1} label="Fotoğraf" onViewImage={() => onViewImage && onViewImage(page)} />
    </div>
  )
}
