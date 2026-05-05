/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react'

const ToastContext = createContext(null)

const toneClasses = {
  success:
    'border-[var(--success-border)] bg-[var(--success-surface)] text-[var(--text-primary)]',
  danger:
    'border-[var(--danger-border)] bg-[var(--danger-surface)] text-[var(--text-primary)]',
  info:
    'border-[rgba(106,163,255,0.34)] bg-[linear-gradient(135deg,rgba(20,50,103,0.22),rgba(10,24,52,0.88))] text-[var(--text-primary)]',
}

function ToastIcon({ variant }) {
  if (variant === 'success') {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#8ef0b7]" fill="none">
        <path
          d="M5 13.2 9.2 17 19 7.5"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }

  if (variant === 'info') {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#8fbbff]" fill="none">
        <path
          d="M12 8.25h.01M11 11h1v5h1"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#ff9f9f]" fill="none">
      <path
        d="M12 8v5m0 3h.01"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10.29 3.86 1.82 18a2 2 0 0 0 1.72 3h16.92a2 2 0 0 0 1.72-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ToastCard({ toast, onDismiss }) {
  const toneClass = toneClasses[toast.variant] || toneClasses.info

  return (
    <div
      className={`w-full max-w-sm rounded-2xl border px-4 py-3 shadow-[0_20px_50px_rgba(4,10,20,0.42)] backdrop-blur-md animate-[fadeInUp_0.28s_ease] ${toneClass}`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">
          <ToastIcon variant={toast.variant} />
        </div>
        <div className="min-w-0 flex-1">
          {toast.title ? (
            <p className="font-semibold text-[var(--text-primary)]">{toast.title}</p>
          ) : null}
          <p className={`text-sm text-[var(--text-primary)]/84 ${toast.title ? 'mt-1' : ''}`}>
            {toast.message}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onDismiss(toast.id)}
          className="rounded-lg px-2 py-1 text-xs text-[var(--text-muted)] transition hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
        >
          Kapat
        </button>
      </div>
    </div>
  )
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const nextIdRef = useRef(1)

  const dismissToast = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const showToast = useCallback(
    ({ title, message, variant = 'info', duration = 3600 }) => {
      const id = nextIdRef.current
      nextIdRef.current += 1

      setToasts((current) => [...current, { id, title, message, variant }])

      if (duration > 0) {
        window.setTimeout(() => {
          dismissToast(id)
        }, duration)
      }

      return id
    },
    [dismissToast]
  )

  const value = useMemo(
    () => ({
      showToast,
      dismissToast,
    }),
    [dismissToast, showToast]
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[80] flex w-[min(92vw,24rem)] flex-col gap-3">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastCard toast={toast} onDismiss={dismissToast} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)

  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }

  return context
}
