import { useEffect, useState } from 'react'
import useAuthStore from '../../store/useAuthStore.js'
import useThemeStore from '../../store/useThemeStore.js'
import useUiStore from '../../store/useUiStore.js'
import ConfirmDialog from '../shared/ConfirmDialog.jsx'

export default function TopBar() {
  const logout = useAuthStore((state) => state.logout)
  const theme = useThemeStore((state) => state.theme)
  const toggleTheme = useThemeStore((state) => state.toggleTheme)
  const headerBackNav = useUiStore((state) => state.headerBackNav)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <>
      <header
        className={`sticky top-0 z-40 flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)] transition-all duration-300 ${
          scrolled ? 'px-8 py-2' : 'px-8 py-5'
        }`}
      >
        {/* Sol taraf */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Back navigation — BookDetail mount'ta doldurur */}
          {headerBackNav && (
            <button
              type="button"
              onClick={headerBackNav.action}
              className={`inline-flex shrink-0 items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                headerBackNav.isFromSearch
                  ? 'border-[var(--accent-dim)] bg-[var(--accent-dim)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white'
                  : 'border-[var(--border)] text-[var(--text-primary)] hover:border-[var(--accent)]'
              }`}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none">
                <path d="m15 6-6 6 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {headerBackNav.label}
            </button>
          )}

          <div className="min-w-0">
            {/* "Sayfa Durumu" satırı — scroll'da gizlenir */}
            <p
              className={`text-xs uppercase tracking-[0.3em] text-[var(--text-muted)] transition-all duration-300 overflow-hidden ${
                scrolled ? 'max-h-0 opacity-0' : 'max-h-6 opacity-100'
              }`}
            >
              {headerBackNav ? (headerBackNav.bookName || 'Cilt Sayfaları') : 'Sayfa Durumu'}
            </p>
            <p
              className={`font-serif text-[var(--text-primary)] transition-all duration-300 ${
                scrolled ? 'text-sm' : 'text-xl'
              }`}
            >
              {headerBackNav ? (headerBackNav.bookName || 'Cilt') : 'Cilt Dijital Kayıt Sistemi'}
            </p>
          </div>
        </div>

        {/* Sağ taraf — her zaman görünür */}
        <div className="flex shrink-0 items-center gap-3">
          <button
            type="button"
            onClick={toggleTheme}
            className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2 text-sm text-[var(--text-primary)] transition hover:border-[var(--accent)]"
          >
            {theme === 'dark' ? (
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
                <path
                  d="M12 3v2.2M12 18.8V21M5.64 5.64l1.56 1.56M16.8 16.8l1.56 1.56M3 12h2.2M18.8 12H21M5.64 18.36l1.56-1.56M16.8 7.2l1.56-1.56M15.5 12A3.5 3.5 0 1 1 8.5 12a3.5 3.5 0 0 1 7 0Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
                <path
                  d="M20 15.2A8.5 8.5 0 1 1 8.8 4a6.8 6.8 0 1 0 11.2 11.2Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </button>
          <button
            type="button"
            onClick={() => setShowLogoutConfirm(true)}
            className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm text-[var(--text-primary)] transition hover:border-[var(--accent)]"
          >
            Çıkış Yap
          </button>
        </div>
      </header>

      {showLogoutConfirm ? (
        <ConfirmDialog
          title="Çıkış Yap"
          message="Oturumu kapatmak istiyor musun?"
          onCancel={() => setShowLogoutConfirm(false)}
          onConfirm={() => {
            setShowLogoutConfirm(false)
            logout()
          }}
        />
      ) : null}
    </>
  )
}
