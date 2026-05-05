import Modal from './Modal.jsx'

export default function ConfirmDialog({ title, message, onConfirm, onCancel }) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p className="text-sm text-[var(--text-muted)]">{message}</p>
      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-[var(--text-muted)]"
        >
          Vazgec
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="rounded-lg bg-[var(--danger)] px-4 py-2 text-sm text-white"
        >
          Onayla
        </button>
      </div>
    </Modal>
  )
}
