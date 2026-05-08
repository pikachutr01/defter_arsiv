import Modal from './Modal.jsx'

export default function ConfirmDialog({
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel = 'Onayla',
  cancelLabel = 'Vazgeç',
  // variant: 'danger' (varsayılan) | 'warning' | 'info'
  variant = 'danger',
}) {
  const variantStyles = {
    danger: {
      box: 'border-[var(--danger-border)] bg-[var(--danger-surface)] shadow-[0_18px_40px_rgba(72,16,24,0.18)]',
      hint: 'Bu işlem geri alınamaz.',
      confirmBtn: 'border-[var(--danger-border)] bg-[var(--danger)] hover:bg-[var(--danger-strong)] text-white',
    },
    warning: {
      box: 'border-[var(--border)] bg-[var(--bg-elevated)]',
      hint: null,
      confirmBtn: 'border-[var(--accent-dim)] bg-[var(--accent-dim)] hover:bg-[var(--accent)] hover:text-white text-[var(--accent)]',
    },
    info: {
      box: 'border-[var(--border)] bg-[var(--bg-elevated)]',
      hint: null,
      confirmBtn: 'border-[var(--accent-dim)] bg-[var(--accent-dim)] hover:bg-[var(--accent)] hover:text-white text-[var(--accent)]',
    },
  }

  const s = variantStyles[variant] ?? variantStyles.danger

  return (
    <Modal title={title} onClose={onCancel} panelClassName="max-w-xl">
      <div className={`rounded-2xl border px-4 py-4 ${s.box}`}>
        {s.hint && (
          <p className="text-sm font-semibold text-[var(--text-primary)]">{s.hint}</p>
        )}
        <p className={`text-sm text-[var(--text-primary)]/82 ${s.hint ? 'mt-2' : ''}`}>{message}</p>
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-4 py-2 text-sm text-[var(--text-muted)] transition hover:border-[var(--accent)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${s.confirmBtn}`}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
