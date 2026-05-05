import { NavLink } from 'react-router-dom'
import useUiStore from '../../store/useUiStore.js'

const navItems = [
  {
    to: '/',
    label: 'Ciltler',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
        <path
          d="M6 4.5h9.5A2.5 2.5 0 0 1 18 7v12.5H8.5A2.5 2.5 0 0 0 6 22V4.5Zm0 0A2.5 2.5 0 0 0 3.5 7v10A2.5 2.5 0 0 0 6 19.5H18"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    to: '/search',
    label: 'Arama',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
        <circle cx="11" cy="11" r="6.2" stroke="currentColor" strokeWidth="1.8" />
        <path
          d="m20 20-4.2-4.2"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    to: '/pdf-export',
    label: 'PDF',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
        <path
          d="M7 3.5h7l4 4V20a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 20V5A1.5 1.5 0 0 1 7.5 3.5Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
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
        <path
          d="M12 8.2a3.8 3.8 0 1 1 0 7.6 3.8 3.8 0 0 1 0-7.6Z"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path
          d="m4.8 13.3-1.3-1.1 1.3-2.4 1.7.2a6.6 6.6 0 0 1 1.1-1l-.1-1.8 2.5-1 1 1.4c.4 0 .9 0 1.3 0l1-1.4 2.5 1-.1 1.8c.4.3.8.6 1.1 1l1.7-.2 1.3 2.4-1.3 1.1c0 .4 0 .9 0 1.3l1.3 1.1-1.3 2.4-1.7-.2c-.3.4-.7.7-1.1 1l.1 1.8-2.5 1-1-1.4a7 7 0 0 1-1.3 0l-1 1.4-2.5-1 .1-1.8a6.6 6.6 0 0 1-1.1-1l-1.7.2-1.3-2.4 1.3-1.1a7 7 0 0 1 0-1.3Z"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
]

export default function Sidebar() {
  const isSidebarCollapsed = useUiStore((state) => state.isSidebarCollapsed)
  const toggleSidebar = useUiStore((state) => state.toggleSidebar)

  return (
    <aside
      className={`flex shrink-0 flex-col border-r border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-4 py-6 transition-[width,padding] duration-300 ${
        isSidebarCollapsed ? 'w-24' : 'w-72'
      }`}
    >
      <div className={`mb-10 ${isSidebarCollapsed ? 'items-center' : ''} flex flex-col`}>
        <div className="flex w-full items-start justify-between gap-3">
          <div className={`min-w-0 transition-all duration-300 ${isSidebarCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
            {!isSidebarCollapsed ? (
              <>
                <div className="text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">
                  Cilt Dijital Kayıt Sistemi
                </div>
                <h1 className="mt-3 text-2xl text-[var(--text-primary)]">
                  Arşiv Yöneticisi
                </h1>
              </>
            ) : null}
          </div>
          <button
            type="button"
            onClick={toggleSidebar}
            className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-2 text-[var(--text-muted)] transition hover:border-[var(--accent)] hover:text-[var(--text-primary)]"
            title={isSidebarCollapsed ? 'Menüyü Genişlet' : 'Menüyü Daralt'}
          >
            <svg
              viewBox="0 0 24 24"
              className={`h-5 w-5 transition-transform duration-300 ${isSidebarCollapsed ? 'rotate-180' : ''}`}
              fill="none"
            >
              <path
                d="m15 6-6 6 6 6"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `group flex items-center rounded-xl transition ${
                isSidebarCollapsed ? 'justify-center px-3 py-3' : 'gap-3 px-4 py-3'
              } ${
                isActive
                  ? 'bg-[var(--accent-dim)] text-[var(--text-primary)] shadow-[var(--shadow-card)]'
                  : 'text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]'
              }`
            }
            title={isSidebarCollapsed ? item.label : undefined}
          >
            <span className="shrink-0">{item.icon}</span>
            <span
              className={`overflow-hidden whitespace-nowrap text-sm transition-all duration-300 ${
                isSidebarCollapsed ? 'max-w-0 opacity-0' : 'max-w-[10rem] opacity-100'
              }`}
            >
              {item.label}
            </span>
          </NavLink>
        ))}
      </nav>

      <div
        className={`mt-10 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-4 text-xs text-[var(--text-muted)] transition-all duration-300 ${
          isSidebarCollapsed ? 'pointer-events-none max-h-0 overflow-hidden border-transparent p-0 opacity-0' : 'max-h-40 opacity-100'
        }`}
      >
        Fotoğraf durumunu, arama sonuçlarını ve dışa aktarımları buradan yönetin.
      </div>
    </aside>
  )
}
