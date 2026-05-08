import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ipc } from '../utils/ipc.js'
import SearchBar from '../components/shared/SearchBar.jsx'
import EmptyState from '../components/shared/EmptyState.jsx'
import useSettingsStore from '../store/useSettingsStore.js'
import { toLocalAssetUrl } from '../utils/paths.js'
import ImageViewer from '../components/images/ImageViewer.jsx'

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

const PageResultCard = memo(function PageResultCard({ item, query, onClick, onPreview, storagePath }) {
  const imageUrl = item.image ? toLocalAssetUrl(storagePath, item.image) : null

  return (
    <div className="relative flex min-h-[8rem] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] transition hover:border-[var(--accent)] hover:shadow-[var(--shadow-card)]">
      <div className="absolute right-3 top-3 z-10">
        <ResultBadge type="page">Sayfa</ResultBadge>
      </div>

      {/* Resim alanı — göz önizleme overlay */}
      <div className="group relative flex h-auto w-24 shrink-0 flex-col items-center justify-center overflow-hidden bg-[var(--bg-elevated)] sm:w-28">
        {imageUrl ? (
          <>
            <img src={imageUrl} alt={`Sayfa ${item.page_number}`} className="absolute inset-0 h-full w-full object-cover" />
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onPreview?.(item) }}
              className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all duration-200 group-hover:bg-black/50 group-hover:opacity-100"
              title="Önizle"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm ring-1 ring-white/30 transition-transform duration-200 group-hover:scale-110">
                <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </span>
            </button>
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center px-2 text-center text-[var(--text-muted)] opacity-60">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <span className="text-[10px] font-semibold uppercase tracking-[0.1em]">Görsel Yok</span>
          </div>
        )}
      </div>

      {/* İçerik — tıklanınca sayfaya git */}
      <button
        type="button"
        onClick={onClick}
        className="flex flex-1 flex-col gap-1.5 p-3 pr-16 text-left"
      >
        <div className="text-[10px] uppercase tracking-[0.1em] text-[var(--text-muted)] line-clamp-1">
          {item.book_name} / Sayfa {item.page_number}
        </div>
        <HighlightedText
          text={`${item.book_name} - Sayfa ${item.page_number}`}
          query={query}
          className="text-sm font-semibold text-[var(--text-primary)] line-clamp-1"
        />
        <div className="mt-1 flex flex-col gap-1.5">
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
    </div>
  )
})

export default function Search() {
  const [query, setQuery] = useState('')
  const [searchType, setSearchType] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [results, setResults] = useState([])
  const [totalResults, setTotalResults] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [isSearching, setIsSearching] = useState(false)
  const [previewItem, setPreviewItem] = useState(null)
  const navigate = useNavigate()
  const location = useLocation()
  const storagePath = useSettingsStore((state) => state.storagePath)
  const debounceRef = useRef(null)
  const restoredRef = useRef(false)

  const ITEMS_PER_PAGE = 50

  const runSearch = useCallback(async (text, type, page) => {
    if (text.trim().length === 0) {
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

  // "Aramaya Dön" ile geri dönüldüğünde sorgu + sayfa restore
  useEffect(() => {
    if (restoredRef.current) return
    const state = location.state
    if (state?.restoreQuery) {
      restoredRef.current = true
      const { restoreQuery, restoreType, restorePage } = state
      setQuery(restoreQuery)
      if (restoreType) setSearchType(restoreType)
      runSearch(restoreQuery, restoreType || 'all', restorePage || 1)
      // State'i temizle (F5'te tekrar restore olmasın)
      window.history.replaceState({}, '')
    }
  }, [location.state, runSearch])

  const handleSearch = useCallback(
    (text) => {
      setQuery(text)
      if (debounceRef.current) clearTimeout(debounceRef.current)
      const trimmed = text.trim()
      if (trimmed.length >= 2) {
        debounceRef.current = setTimeout(() => runSearch(text, searchType, 1), DEBOUNCE_MS)
      } else if (trimmed.length === 0) {
        setResults([])
        setTotalResults(0)
        setTotalPages(0)
      }
    },
    [runSearch, searchType]
  )

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      const trimmed = query.trim()
      if (searchType === 'page' && trimmed.length === 1) {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        runSearch(query, searchType, 1)
      } else if (trimmed.length >= 2) {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        runSearch(query, searchType, 1)
      }
    }
  }, [query, searchType, runSearch])

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

  const navigateToBook = useCallback((bookId) => {
    navigate(`/books/${bookId}`, {
      state: { fromSearch: true, query, searchType, page: currentPage },
    })
  }, [navigate, query, searchType, currentPage])

  const navigateToPage = useCallback((bookId, pageId) => {
    navigate(`/books/${bookId}?scrollTo=${pageId}`, {
      state: { fromSearch: true, query, searchType, page: currentPage },
    })
  }, [navigate, query, searchType, currentPage])

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const isValidLength = searchType === 'page' ? query.trim().length >= 1 : query.trim().length >= 2
  const isEmpty = results.length === 0

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
            onKeyDown={handleKeyDown}
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
          title={!isValidLength ? 'Arama yapmaya hazır' : 'Sonuç bulunamadı'}
          description={
            !isValidLength
              ? (searchType === 'page' ? "En az 1 karakter girip Enter'a basarak aramayı başlatın." : 'En az 2 karakter girerek aramayı başlatın.')
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
                  onClick={() => navigateToBook(item.book_id)}
                />
              ) : (
                <PageResultCard
                  key={item.id}
                  item={item}
                  query={query}
                  storagePath={storagePath}
                  onClick={() => navigateToPage(item.book_id, item.page_id)}
                  onPreview={() => setPreviewItem(item)}
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

      {previewItem && (
        <ImageViewer
          title={`${previewItem.book_name} — Sayfa ${previewItem.page_number}`}
          imagePath={previewItem.image}
          onClose={() => setPreviewItem(null)}
        />
      )}
    </section>
  )
}