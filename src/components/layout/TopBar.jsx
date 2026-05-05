import useAuthStore from '../../store/useAuthStore.js'

export default function TopBar() {
  const logout = useAuthStore((state) => state.logout)

  return (
    <header className="flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-8 py-5">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">
          Sayfa Durumu
        </p>
        <h2 className="text-xl">Cilt Dijital Kayıt Sistemi</h2>
      </div>
      <button
        type="button"
        onClick={logout}
        className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm text-[var(--text-primary)] transition hover:border-[var(--accent)] hover:text-white"
      >
        Çıkış Yap
      </button>
    </header>
  )
}
