export default function ImageUploader({ label, onUpload }) {
  return (
    <button
      type="button"
      onClick={onUpload}
      className="flex h-40 w-full items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--bg-elevated)] text-sm text-[var(--text-muted)] transition hover:border-[var(--accent)]"
    >
      {label}
    </button>
  )
}
