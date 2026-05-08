import { NavLink } from 'react-router-dom'
import useUiStore from '../../store/useUiStore.js'
import useBookStore from '../../store/useBookStore.js'
import usePdfQueueStore from '../../store/usePdfQueueStore.js'

// ─── Nav öğeleri ─────────────────────────────────────────────────────────────
// badge.type: 'danger' → kırmızı (PDF kuyruğu), 'neutral' → gri (cilt sayısı)

const navItems = [
  {
    to: '/',
    label: 'Ciltler',
    badgeType: 'neutral',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
        <path d="M6 4.5h9.5A2.5 2.5 0 0 1 18 7v12.5H8.5A2.5 2.5 0 0 0 6 22V4.5Zm0 0A2.5 2.5 0 0 0 3.5 7v10A2.5 2.5 0 0 0 6 19.5H18"
          stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    to: '/search',
    label: 'Arama',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
        <circle cx="11" cy="11" r="6.2" stroke="currentColor" strokeWidth="1.8" />
        <path d="m20 20-4.2-4.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    to: '/pdf-export',
    label: 'PDF',
    badgeType: 'danger',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
        <path d="M7 3.5h7l4 4V20a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 20V5A1.5 1.5 0 0 1 7.5 3.5Z"
          stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M14 3.5V8h4" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M8.5 16h7M8.5 12.5h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    to: '/settings',
    label: 'Ayarlar',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
        <path d="M12 8.2a3.8 3.8 0 1 1 0 7.6 3.8 3.8 0 0 1 0-7.6Z"
          stroke="currentColor" strokeWidth="1.8" />
        <path d="m4.8 13.3-1.3-1.1 1.3-2.4 1.7.2a6.6 6.6 0 0 1 1.1-1l-.1-1.8 2.5-1 1 1.4c.4 0 .9 0 1.3 0l1-1.4 2.5 1-.1 1.8c.4.3.8.6 1.1 1l1.7-.2 1.3 2.4-1.3 1.1c0 .4 0 .9 0 1.3l1.3 1.1-1.3 2.4-1.7-.2c-.3.4-.7.7-1.1 1l.1 1.8-2.5 1-1-1.4a7 7 0 0 1-1.3 0l-1 1.4-2.5-1 .1-1.8a6.6 6.6 0 0 1-1.1-1l-1.7.2-1.3-2.4 1.3-1.1a7 7 0 0 1 0-1.3Z"
          stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    to: '/help',
    label: 'Yardım',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
        <path d="M12 4.5a6.5 6.5 0 0 0-6.5 6.5c0 2.2 1.1 4.1 2.8 5.3l.2 2.7 2.6-1.3c.3.1.6.1.9.1h.1a6.5 6.5 0 1 0 0-13Z"
          stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9.7 9.7a2.3 2.3 0 1 1 3.9 1.7c-.7.6-1.3 1-1.3 2"
          stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="12" cy="16.8" r="0.9" fill="currentColor" />
      </svg>
    ),
  },
]

// ─── Badge bileşeni ───────────────────────────────────────────────────────────

function Badge({ count, type, collapsed }) {
  if (!count) return null

  const colorClass = type === 'danger'
    ? 'bg-[var(--danger)] text-white'
    : 'bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-muted)]'

  if (collapsed) {
    return (
      <span className={`absolute -right-1.5 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-bold shadow-sm ${colorClass}`}>
        {count}
      </span>
    )
  }

  return (
    <span className={`ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold shadow-sm ${colorClass}`}>
      {count}
    </span>
  )
}

// ─── Bileşen ─────────────────────────────────────────────────────────────────

export default function Sidebar() {
  const isSidebarCollapsed = useUiStore((state) => state.isSidebarCollapsed)
  const toggleSidebar = useUiStore((state) => state.toggleSidebar)
  const pdfItemsCount = usePdfQueueStore((state) => state.items.length)
  const booksCount = useBookStore((state) => state.books.length)

  // Her nav öğesi için kaç badge gösterileceğini belirle
  const getBadgeCount = (to) => {
    if (to === '/pdf-export') return pdfItemsCount
    if (to === '/') return booksCount
    return 0
  }

  return (
    <aside
      className={`sticky top-0 h-screen flex shrink-0 flex-col border-r border-[var(--border-subtle)] bg-[var(--bg-secondary)] py-6 transition-[width] duration-300 ${isSidebarCollapsed ? 'w-[72px] px-3' : 'w-72 px-4'
        }`}
    >
      {/* ── Başlık + collapse butonu ── */}
      <div className={`mb-10 flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between gap-3'}`}>
        {/* Başlık — collapsed modda gizli */}
        <div className={`min-w-0 overflow-hidden transition-all duration-300 ${isSidebarCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
          <div className="text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">
            Cilt Dijital Kayıt Sistemi
          </div>
          <h1 className="mt-3 text-2xl text-[var(--text-primary)]">
            Arşiv Yöneticisi
          </h1>
        </div>

        {/* Collapse butonu */}
        <button
          type="button"
          onClick={toggleSidebar}
          title={isSidebarCollapsed ? 'Menüyü Genişlet' : 'Menüyü Daralt'}
          className="shrink-0 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-2 text-[var(--text-muted)] transition hover:border-[var(--accent)] hover:text-[var(--text-primary)]"
        >
          <svg
            viewBox="0 0 24 24"
            className={`h-5 w-5 transition-transform duration-300 ${isSidebarCollapsed ? 'rotate-180' : ''}`}
            fill="none"
          >
            <path d="m15 6-6 6 6 6" stroke="currentColor" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* ── Navigasyon ── */}
      <nav className="flex flex-1 flex-col gap-1">
        {navItems.map((item) => {
          const badgeCount = getBadgeCount(item.to)

          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              title={isSidebarCollapsed ? item.label : undefined}
              className={({ isActive }) =>
                `group relative flex items-center rounded-xl transition-all duration-150 ${isSidebarCollapsed ? 'justify-center px-0 py-3' : 'gap-3 px-4 py-2.5'
                } ${isActive
                  ? 'bg-[var(--accent-dim)] text-[var(--text-primary)] shadow-[var(--shadow-card)]'
                  : 'text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]'
                }`
              }
            >
              {/* İkon — collapsed modda üstünde badge göster */}
              <span className="relative shrink-0">
                {item.icon}
                {isSidebarCollapsed && (
                  <Badge count={badgeCount} type={item.badgeType} collapsed={true} />
                )}
              </span>

              {/* Etiket — collapsed modda animasyonla gizlenir */}
              <span className={`flex-1 overflow-hidden whitespace-nowrap text-sm transition-all duration-300 ${isSidebarCollapsed ? 'max-w-0 opacity-0' : 'max-w-[10rem] opacity-100'
                }`}>
                {item.label}
              </span>

              {/* Satır sağında badge — sadece expanded modda */}
              {!isSidebarCollapsed && (
                <Badge count={badgeCount} type={item.badgeType} collapsed={false} />
              )}

              {/* Collapsed modda hover tooltip */}
              {isSidebarCollapsed && (
                <span className="pointer-events-none absolute left-full z-50 ml-3 whitespace-nowrap rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-2.5 py-1.5 text-xs text-[var(--text-primary)] opacity-0 shadow-[var(--shadow-soft)] transition-opacity duration-150 group-hover:opacity-100">
                  {item.label}
                  {badgeCount > 0 && (
                    <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${item.badgeType === 'danger' ? 'bg-[var(--danger)] text-white' : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]'
                      }`}>
                      {badgeCount}
                    </span>
                  )}
                </span>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* ── Alt bilgi notu ── */}
      <div className={`mt-10 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] text-xs text-[var(--text-muted)] transition-all duration-300 ${isSidebarCollapsed
          ? 'pointer-events-none max-h-0 overflow-hidden border-transparent p-0 opacity-0'
          : 'max-h-40 p-4 opacity-100'
        }`}>
        Fotoğraf durumunu, arama sonuçlarını ve dışa aktarımları buradan yönetin.
      </div>
    </aside>
  )
}