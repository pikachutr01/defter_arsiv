import Modal from './Modal.jsx'

export default function ConfirmDialog({ title, message, onConfirm, onCancel }) {
  return (
    <Modal title={title} onClose={onCancel} panelClassName="max-w-xl">
      <div className="rounded-2xl border border-[var(--danger-border)] bg-[var(--danger-surface)] px-4 py-4 shadow-[0_18px_40px_rgba(72,16,24,0.18)]">
        <p className="text-sm font-semibold text-[var(--text-primary)]">
          Bu işlem geri alınamaz.
        </p>
        <p className="mt-2 text-sm text-[var(--text-primary)]/82">{message}</p>
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-4 py-2 text-sm text-[var(--text-muted)] transition hover:border-[var(--accent)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
        >
          Vazgeç
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="rounded-lg border border-[var(--danger-border)] bg-[var(--danger)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--danger-strong)]"
        >
          Onayla
        </button>
      </div>
    </Modal>
  )
}
