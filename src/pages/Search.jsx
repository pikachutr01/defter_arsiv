import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ipc } from '../utils/ipc.js'
import SearchBar from '../components/shared/SearchBar.jsx'
import EmptyState from '../components/shared/EmptyState.jsx'
import useSettingsStore from '../store/useSettingsStore.js'
import { toLocalAssetUrl } from '../utils/paths.js'

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function HighlightedText({ text, query, className = '' }) {
  if (!text) {
    return null
  }

  if (!query.trim()) {
    return <span className={className}>{text}</span>
  }

  const pattern = new RegExp(`(${escapeRegExp(query.trim())})`, 'ig')
  const parts = text.split(pattern)

  return (
    <span className={className}>
      {parts.map((part, index) =>
        part.toLowerCase() === query.trim().toLowerCase() ? (
          <mark
            key={`${part}-${index}`}
            className="rounded bg-[rgba(79,142,247,0.18)] px-1 text-[var(--text-primary)]"
          >
            {part}
          </mark>
        ) : (
          <span key={`${part}-${index}`}>{part}</span>
        )
      )}
    </span>
  )
}

function ResultBadge({ type, children }) {
  const isBook = type === 'book'

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${
        isBook
          ? 'bg-[rgba(79,142,247,0.16)] text-[var(--accent)]'
          : 'bg-[rgba(52,201,122,0.14)] text-[var(--success)]'
      }`}
    >
      {children}
    </span>
  )
}

function BookResultCard({ item, query, onClick, storagePath }) {
  const coverUrl = item.cover_image ? toLocalAssetUrl(storagePath, item.cover_image) : null
  const descriptionSource = item.match_sources?.find((source) => source.label === 'Açıklama')
  const noteSource = item.match_sources?.find((source) => source.label === 'Cilt Notu')

  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex min-h-[13rem] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] text-left transition hover:border-[var(--accent)] hover:shadow-[var(--shadow-card)]"
    >
      <div className="absolute right-4 top-4">
        <ResultBadge type="book">Cilt</ResultBadge>
      </div>
      <div className="h-auto w-32 shrink-0 overflow-hidden bg-[var(--bg-elevated)] sm:w-36">
        {coverUrl ? (
          <img src={coverUrl} alt={item.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full min-h-[13rem] items-center justify-center px-3 text-center text-[11px] uppercase tracking-[0.22em] text-[var(--text-muted)]">
            Kapak Yok
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4 pr-20">
        <div className="text-[11px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
          Toplam sayfa: {item.total_pages || 0}
        </div>
        <HighlightedText
          text={item.title}
          query={query}
          className="text-base font-semibold text-[var(--text-primary)]"
        />
        {descriptionSource?.text ? (
          <div className="text-sm text-[var(--text-muted)]">
            <HighlightedText text={descriptionSource.text} query={query} />
          </div>
        ) : item.description ? (
          <div className="text-sm text-[var(--text-muted)]">
            <HighlightedText text={item.description} query={query} />
          </div>
        ) : null}
        {noteSource?.text ? (
          <div className="mt-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
              Cilt Notu
            </div>
            <div className="mt-1 text-xs leading-5 text-[var(--text-primary)]">
              <HighlightedText text={noteSource.text} query={query} />
            </div>
          </div>
        ) : null}
      </div>
    </button>
  )
}

function PageResultCard({ item, query, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5 text-left transition hover:border-[var(--accent)] hover:shadow-[var(--shadow-card)]"
    >
      <div className="absolute right-4 top-4">
        <ResultBadge type="page">Sayfa</ResultBadge>
      </div>
      <div className="pr-20 text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
        {item.book_name} / Sayfa {item.page_number}
      </div>

      <div className="mt-3">
        <HighlightedText
          text={`${item.book_name} - Sayfa ${item.page_number}`}
          query={query}
          className="text-base font-semibold text-[var(--text-primary)]"
        />
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {item.match_sources?.map((source) => (
          <div
            key={`${item.id}-${source.label}-${source.text}`}
            className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2.5"
          >
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
              {source.label}
            </div>
            <div className="mt-1 text-sm text-[var(--text-primary)]">
              <HighlightedText text={source.text} query={query} />
            </div>
          </div>
        ))}
      </div>
    </button>
  )
}

export default function Search() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const navigate = useNavigate()
  const storagePath = useSettingsStore((state) => state.storagePath)

  const handleSearch = async (text) => {
    setQuery(text)
    if (text.trim().length < 2) {
      setResults([])
      return
    }

    const result = await ipc.searchQuery(text)
    if (result.success) {
      setResults(result.data || [])
    }
  }

  const groupedResults = useMemo(() => results, [results])

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl">Arama</h2>
        <p className="text-sm text-[var(--text-muted)]">
          Cilt adı, açıklama, cilt notu ve sayfa notlarında hızlı arama yapın.
        </p>
      </div>
      <SearchBar
        value={query}
        onChange={handleSearch}
        placeholder="Cilt, açıklama, not veya sayfa numarası ara..."
      />

      {groupedResults.length === 0 ? (
        <EmptyState
          title={query.trim().length < 2 ? 'Arama yapmaya hazır' : 'Sonuç bulunamadı'}
          description={
            query.trim().length < 2
              ? 'En az 2 karakter girerek aramayı başlatın.'
              : 'Arama kriterlerinizi değiştirin veya daha uzun bir ifade deneyin.'
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {groupedResults.map((item) =>
            item.result_type === 'book' ? (
              <BookResultCard
                key={item.id}
                item={item}
                query={query}
                storagePath={storagePath}
                onClick={() => navigate(`/books/${item.book_id}`)}
              />
            ) : (
              <PageResultCard
                key={item.id}
                item={item}
                query={query}
                onClick={() => navigate(`/books/${item.book_id}/pages/${item.page_id}`)}
              />
            )
          )}
        </div>
      )}
    </section>
  )
}
