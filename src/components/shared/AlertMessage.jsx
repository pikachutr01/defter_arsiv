const variantClasses = {
  danger:
    'border-[var(--danger-border)] bg-[var(--danger-surface)] text-[var(--text-primary)] shadow-[0_18px_40px_rgba(72,16,24,0.22)]',
  success:
    'border-[var(--success-border)] bg-[var(--success-surface)] text-[var(--text-primary)] shadow-[0_18px_40px_rgba(11,42,27,0.18)]',
}

const accentClasses = {
  danger: 'bg-[var(--danger-strong)]',
  success: 'bg-[var(--success)]',
}

export default function AlertMessage({
  children,
  title,
  variant = 'danger',
  className = '',
}) {
  const surfaceClass = variantClasses[variant] || variantClasses.danger
  const accentClass = accentClasses[variant] || accentClasses.danger

  return (
    <div
      className={`rounded-2xl border px-4 py-3 text-sm backdrop-blur-sm ${surfaceClass} ${className}`.trim()}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className={`mt-1 h-2.5 w-2.5 rounded-full shadow-[0_0_16px_currentColor] ${accentClass}`}
        />
        <div className="min-w-0">
          {title ? <p className="font-semibold text-[var(--text-primary)]">{title}</p> : null}
          <div className={title ? 'mt-1 text-[var(--text-primary)]/84' : 'text-[var(--text-primary)]'}>
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
