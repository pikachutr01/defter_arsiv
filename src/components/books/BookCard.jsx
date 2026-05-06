import BookCover from './BookCover.jsx'

export default function BookCard({ book, onSelect, onEdit, onDelete, className = '' }) {
  const totalPages = book.total_pages || 0
  const imageCount = book.image_count ?? 0

  return (
    <div className={`group flex h-full w-full flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] shadow-[var(--shadow-card)] transition hover:-translate-y-1 hover:border-[var(--accent)] ${className}`}>
      <button type="button" onClick={() => onSelect(book)} className="text-left">
        <BookCover coverPath={book.cover_image} title={book.name} />
      </button>
      <div className="flex flex-1 flex-col gap-2 px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <button
            type="button"
            onClick={() => onSelect(book)}
            className="text-left"
          >
            <h3 className="text-lg text-[var(--text-primary)]">{book.name}</h3>
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onEdit(book)}
              className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--text-muted)] transition hover:border-[var(--accent)] hover:text-[var(--text-primary)]"
            >
              Düzenle
            </button>
            <button
              type="button"
              onClick={() => onDelete(book)}
              className="rounded-lg border border-[var(--danger-border)] px-3 py-1.5 text-xs text-[var(--text-primary)] transition hover:border-[var(--danger-strong)]"
            >
              Sil
            </button>
          </div>
        </div>
        <p className="text-xs text-[var(--text-muted)]">
          {book.description || 'Açıklama eklenmedi'}
        </p>
        <div className="mt-3 flex items-center gap-3 text-xs text-[var(--text-muted)]">
          <span>
            Toplam sayfa: <span className="text-[var(--text-primary)]">{totalPages}</span>
          </span>
          <span className="opacity-30">|</span>
          <span>
            Resim: <span className="text-[var(--text-primary)]">{imageCount}</span>
          </span>
        </div>
      </div>
    </div>
  )
}
