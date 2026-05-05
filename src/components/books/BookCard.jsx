import BookCover from './BookCover.jsx'

export default function BookCard({ book, onSelect }) {
  const totalPages = book.total_pages || 0
  return (
    <button
      type="button"
      onClick={() => onSelect(book)}
      className="group flex flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] text-left shadow-[var(--shadow-card)] transition hover:-translate-y-1 hover:border-[var(--accent)]"
    >
      <BookCover coverPath={book.cover_image} title={book.name} />
      <div className="flex flex-1 flex-col gap-2 px-4 py-4">
        <h3 className="text-lg text-[var(--text-primary)]">{book.name}</h3>
        <p className="text-xs text-[var(--text-muted)]">
          {book.description || 'Açıklama eklenmedi'}
        </p>
        <div className="mt-3 text-xs text-[var(--text-muted)]">
          Toplam sayfa: <span className="text-[var(--text-primary)]">{totalPages}</span>
        </div>
      </div>
    </button>
  )
}
