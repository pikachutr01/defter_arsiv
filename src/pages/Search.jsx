import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ipc } from '../utils/ipc.js'
import SearchBar from '../components/shared/SearchBar.jsx'
import EmptyState from '../components/shared/EmptyState.jsx'
import useSettingsStore from '../store/useSettingsStore.js'
import { toLocalAssetUrl } from '../utils/paths.js'

const DEBOUNCE_MS = 300

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const HighlightedText = memo(function HighlightedText({ text, query, className = '' }) {
  if (!text) return null

  const trimmed = query.trim()
  if (!trimmed) return <span className={className}>{text}</span>

  const pattern = new RegExp(`(${escapeRegExp(trimmed)})`, 'ig')
  const parts = text.split(pattern)
  const lowerTrimmed = trimmed.toLowerCase()

  return (
    <span className={className}>
      {parts.map((part, index) =>
        part.toLowerCase() === lowerTrimmed ? (
          <mark
            key={index}
            className="rounded bg-[rgba(79,142,247,0.18)] px-1 text-[var(--text-primary)]"
          >
            {part}
          </mark>
        ) : (
          <span key={index}>{part}</span>
        )
      )}
    </span>
  )
})

const ResultBadge = memo(function ResultBadge({ type, children }) {
  const isBook = type === 'book'
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${isBook
        ? 'bg-[rgba(79,142,247,0.16)] text-[var(--accent)]'
        : 'bg-[rgba(52,201,122,0.14)] text-[var(--success)]'
        }`}
    >
      {children}
    </span>
  )
})

const BookResultCard = memo(function BookResultCard({ item, query, onClick, storagePath }) {
  const coverUrl = item.cover_image ? toLocalAssetUrl(storagePath, item.cover_image) : null

  // İki ayrı .find() yerine tek geçişte türet
  const { descriptionSource, noteSource } = useMemo(() => {
    let desc = null
    let note = null
    for (const source of item.match_sources || []) {
      if (source.label === 'Açıklama') desc = source
      else if (source.label === 'Cilt Notu') note = source
      if (desc && note) break
    }
    return { descriptionSource: desc, noteSource: note }
  }, [item.match_sources])

  const descriptionText = descriptionSource?.text || item.description || null

  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex min-h-[8rem] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] text-left transition hover:border-[var(--accent)] hover:shadow-[var(--shadow-card)]"
    >
      <div className="absolute right-3 top-3">
        <ResultBadge type="book">Cilt</ResultBadge>
      </div>
      <div className="h-auto w-24 shrink-0 overflow-hidden bg-[var(--bg-elevated)] sm:w-28">
        {coverUrl ? (
          <img src={coverUrl} alt={item.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full min-h-[8rem] items-center justify-center px-2 text-center text-[10px] uppercase tracking-[0.1em] text-[var(--text-muted)]">
            Kapak Yok
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3 pr-16">
        <div className="text-[10px] uppercase tracking-[0.1em] text-[var(--text-muted)]">
          Toplam sayfa: {item.total_pages || 0}
        </div>
        <HighlightedText
          text={item.title}
          query={query}
          className="text-sm font-semibold text-[var(--text-primary)] line-clamp-1"
        />
        {descriptionText ? (
          <div className="text-xs text-[var(--text-muted)] line-clamp-2">
            <HighlightedText text={descriptionText} query={query} />
          </div>
        ) : null}
        {noteSource?.text ? (
          <div className="mt-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-2.5 py-1.5">
            <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
              Cilt Notu
            </div>
            <div className="mt-0.5 text-[11px] leading-4 text-[var(--text-primary)] line-clamp-2">
              <HighlightedText text={noteSource.text} query={query} />
            </div>
          </div>
        ) : null}
      </div>
    </button>
  )
})

const PageResultCard = memo(function PageResultCard({ item, query, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-4 text-left transition hover:border-[var(--accent)] hover:shadow-[var(--shadow-card)]"
    >
      <div className="absolute right-3 top-3">
        <ResultBadge type="page">Sayfa</ResultBadge>
      </div>
      <div className="pr-16 text-[10px] uppercase tracking-[0.1em] text-[var(--text-muted)] line-clamp-1">
        {item.book_name} / Sayfa {item.page_number}
      </div>
      <div className="mt-2">
        <HighlightedText
          text={`${item.book_name} - Sayfa ${item.page_number}`}
          query={query}
          className="text-sm font-semibold text-[var(--text-primary)] line-clamp-1"
        />
      </div>
      <div className="mt-2 flex flex-col gap-1.5">
        {item.match_sources?.map((source, index) => (
          <div
            key={index}
            className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-2.5 py-1.5"
          >
            <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
              {source.label}
            </div>
            <div className="mt-0.5 text-[11px] leading-4 text-[var(--text-primary)] line-clamp-2">
              <HighlightedText text={source.text} query={query} />
            </div>
          </div>
        ))}
      </div>
    </button>
  )
})

export default function Search() {
  const [query, setQuery] = useState('')
  const [searchType, setSearchType] = useState('all') // 'all', 'book', 'page', 'note'
  const [currentPage, setCurrentPage] = useState(1)
  const [results, setResults] = useState([])
  const [totalResults, setTotalResults] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [isSearching, setIsSearching] = useState(false)
  const navigate = useNavigate()
  const storagePath = useSettingsStore((state) => state.storagePath)
  const debounceRef = useRef(null)

  const ITEMS_PER_PAGE = 50

  const runSearch = useCallback(async (text, type, page) => {
    if (text.trim().length < 2) {
      setResults([])
      setTotalResults(0)
      setTotalPages(0)
      return
    }
    setIsSearching(true)
    const result = await ipc.searchQuery({ text, type, page, limit: ITEMS_PER_PAGE })
    setIsSearching(false)
    if (result.success && result.data) {
      setResults(result.data.results || [])
      setTotalResults(result.data.totalResults || 0)
      setTotalPages(result.data.totalPages || 0)
      setCurrentPage(result.data.currentPage || 1)
    }
  }, [])

  const handleSearch = useCallback(
    (text) => {
      setQuery(text)
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => runSearch(text, searchType, 1), DEBOUNCE_MS)
    },
    [runSearch, searchType]
  )

  const handleTypeChange = useCallback(
    (e) => {
      const newType = e.target.value
      setSearchType(newType)
      setCurrentPage(1)
      if (query.trim().length >= 2) {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        runSearch(query, newType, 1)
      }
    },
    [query, runSearch]
  )

  const handlePageChange = useCallback(
    (newPage) => {
      if (newPage < 1 || newPage > totalPages) return
      setCurrentPage(newPage)
      runSearch(query, searchType, newPage)
    },
    [query, searchType, totalPages, runSearch]
  )

  // Unmount'ta bekleyen timer'ı temizle
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const isEmpty = query.trim().length < 2 || results.length === 0

  const getPlaceholder = () => {
    switch (searchType) {
      case 'book': return 'Cilt isminde ara...'
      case 'page': return 'Sayfa numarasında ara...'
      case 'note': return 'Cilt açıklaması ve sayfa notlarında ara...'
      default: return 'Cilt, sayfa numarası veya not ara...'
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl">Arama</h2>
          <p className="text-sm text-[var(--text-muted)]">
            Arama kategorisini seçin ve filtreleyin.
          </p>
        </div>
        {totalResults > 0 && (
          <div className="text-xs text-[var(--text-muted)] bg-[var(--bg-elevated)] border border-[var(--border)] px-3 py-1.5 rounded-lg">
            Toplam <strong>{totalResults}</strong> sonuç bulundu.
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1">
          <SearchBar
            value={query}
            onChange={handleSearch}
            placeholder={getPlaceholder()}
          />
        </div>
        <select
          value={searchType}
          onChange={handleTypeChange}
          className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
        >
          <option value="all">Tümünü Ara</option>
          <option value="book">Cilt Ara</option>
          <option value="page">Sayfa Ara</option>
          <option value="note">Not Ara</option>
        </select>
      </div>

      {isEmpty ? (
        <EmptyState
          title={query.trim().length < 2 ? 'Arama yapmaya hazır' : 'Sonuç bulunamadı'}
          description={
            query.trim().length < 2
              ? 'En az 2 karakter girerek aramayı başlatın.'
              : 'Arama kriterlerinizi değiştirin veya daha uzun bir ifade deneyin.'
          }
        />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {results.map((item) =>
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

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 pt-4 border-t border-[var(--border-subtle)]">
              <button
                type="button"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1 || isSearching}
                className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition hover:bg-[var(--bg-elevated)] disabled:opacity-50"
              >
                Önceki
              </button>
              <span className="text-sm text-[var(--text-muted)]">
                Sayfa <span className="font-semibold text-[var(--text-primary)]">{currentPage}</span> / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages || isSearching}
                className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition hover:bg-[var(--bg-elevated)] disabled:opacity-50"
              >
                Sonraki
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  )
}