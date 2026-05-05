import { NavLink } from 'react-router-dom'

const navItems = [
  { to: '/', label: 'Ciltler' },
  { to: '/search', label: 'Arama' },
  { to: '/pdf-export', label: 'PDF' },
  { to: '/settings', label: 'Ayarlar' },
]

const linkClass = ({ isActive }) =>
  `flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition ${
    isActive
      ? 'bg-[var(--accent-dim)] text-[var(--text-primary)] shadow-[var(--shadow-card)]'
      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
  }`

export default function Sidebar() {
  return (
    <aside className="flex w-64 flex-col border-r border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-5 py-6">
      <div className="mb-10">
        <div className="text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">
          Cilt Dijital Kayıt Sistemi
        </div>
        <h1 className="mt-3 text-2xl text-[var(--text-primary)]">
          Arşiv Yöneticisi
        </h1>
      </div>
      <nav className="flex flex-1 flex-col gap-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={linkClass}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-10 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-4 text-xs text-[var(--text-muted)]">
        Fotoğraf durumunu ve PDF dışa aktarımı buradan yönetin.
      </div>
    </aside>
  )
}
