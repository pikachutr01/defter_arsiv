import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ipc } from '../utils/ipc.js'
import SearchBar from '../components/shared/SearchBar.jsx'
import EmptyState from '../components/shared/EmptyState.jsx'

export default function Search() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const navigate = useNavigate()

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

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl">Arama</h2>
        <p className="text-sm text-[var(--text-muted)]">
          Not metni ve sayfa içeriklerinde hızlı arama.
        </p>
      </div>
      <SearchBar
        value={query}
        onChange={handleSearch}
        placeholder="Not, cilt adı veya sayfa numarası ara..."
      />

      {results.length === 0 ? (
        <EmptyState
          title={
            query.trim().length < 2 ? 'Arama yapmaya hazır' : 'Sonuç bulunamadı'
          }
          description={
            query.trim().length < 2
              ? 'En az 2 karakter girerek aramayı başlatın.'
              : 'Arama kriterlerinizi değiştirin veya daha uzun bir ifade deneyin.'
          }
        />
      ) : (
        <div className="grid gap-4">
          {results.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => navigate(`/books/${item.book_id}/pages/${item.id}`)}
              className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-4 text-left transition hover:border-[var(--accent)]"
            >
              <div className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
                {item.book_name} / Sayfa {item.page_number}
              </div>
              <p className="mt-2 text-sm text-[var(--text-primary)]">
                {item.side_a_notes || item.side_b_notes || 'Not yok'}
              </p>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
