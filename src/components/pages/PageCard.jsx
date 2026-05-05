const SideBadge = ({ uploaded, label }) => (
  <div
    className={`flex items-center justify-between rounded-lg border px-3 py-2 text-xs ${
      uploaded
        ? 'border-[var(--accent)] text-[var(--text-primary)]'
        : 'border-[var(--border)] text-[var(--text-muted)]'
    }`}
  >
    <span>{label}</span>
    <span>{uploaded ? '✓' : '—'}</span>
  </div>
)

export default function PageCard({ page, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(page)}
      className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-4 text-left transition hover:border-[var(--accent)]"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
          Sayfa {page.page_number}
        </span>
      </div>
      <SideBadge uploaded={page.side_a_uploaded === 1} label="A Yüzü" />
      <SideBadge uploaded={page.side_b_uploaded === 1} label="B Yüzü" />
    </button>
  )
}
