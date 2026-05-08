import { useCallback, useEffect } from 'react'

export default function Modal({ title, children, onClose, panelClassName = '', disableBackdropClick = false }) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  const handleBackdropClick = useCallback(
    (event) => {
      if (disableBackdropClick) return
      if (event.target === event.currentTarget) onClose()
    },
    [onClose, disableBackdropClick]
  )

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      onClick={handleBackdropClick}
    >
      <div
        className={`relative w-full animate-[fadeInUp_0.4s_ease] rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-soft)] ${panelClassName}`.trim()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[var(--border)] px-3 py-1 text-xs text-[var(--text-muted)] transition hover:border-[var(--accent)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
          >
            Kapat
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}