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

const getPageStateAppearance = (page) => {
  const uploadedCount =
    (page.side_a_uploaded === 1 ? 1 : 0) + (page.side_b_uploaded === 1 ? 1 : 0)

  if (uploadedCount === 2) {
    return {
      className: 'border-[var(--success)] hover:border-[var(--success)]',
      style: {
        boxShadow:
          '0 0 0 2px color-mix(in srgb, var(--success) 26%, transparent), var(--shadow-card)',
      },
    }
  }

  if (uploadedCount === 1) {
    return {
      className: 'border-[var(--warning)] hover:border-[var(--warning)]',
      style: {
        boxShadow:
          '0 0 0 2px color-mix(in srgb, var(--warning) 24%, transparent), var(--shadow-card)',
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

export default function PageCard({ page, onSelect }) {
  const appearance = getPageStateAppearance(page)

  return (
    <button
      type="button"
      onClick={() => onSelect(page)}
      style={appearance.style}
      className={`flex h-full w-full flex-col gap-3 rounded-2xl border bg-[var(--bg-card)] p-4 text-left transition ${appearance.className}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
          Sayfa {page.page_number}
        </span>
      </div>
      <SideBadge uploaded={page.side_a_uploaded === 1} label="Sol Taraf" />
      <SideBadge uploaded={page.side_b_uploaded === 1} label="Sağ Taraf" />
    </button>
  )
}
