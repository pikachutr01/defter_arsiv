export default function EmptyState({ title, description, action }) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--bg-card)] p-10 text-center">
      <h3 className="text-lg">{title}</h3>
      <p className="mt-2 text-sm text-[var(--text-muted)]">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}
