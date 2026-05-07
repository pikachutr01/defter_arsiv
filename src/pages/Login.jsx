import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../store/useAuthStore.js'
import { ipc } from '../utils/ipc.js'
import AlertMessage from '../components/shared/AlertMessage.jsx'

// ─── Sabitler ────────────────────────────────────────────────────────────────

const COPY_RESET_MS = 2000

// ─── Küçük yardımcı bileşenler ───────────────────────────────────────────────

const CopyIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
    <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
  </svg>
)

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 text-[var(--success)]">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

// Tekrar eden input className
const inputClass =
  'mt-2 w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)] transition'

// ─── Bileşen ─────────────────────────────────────────────────────────────────

export default function Login() {
  const login = useAuthStore((state) => state.login)
  const isLoading = useAuthStore((state) => state.isLoading)
  const error = useAuthStore((state) => state.error)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  const navigate = useNavigate()
  const usernameRef = useRef(null)
  const copyTimerRef = useRef(null)

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [deviceId, setDeviceId] = useState('')
  const [copySuccess, setCopySuccess] = useState(false)

  // Şifre sıfırlama paneli state'i
  const [isResetOpen, setIsResetOpen] = useState(false)
  const [resetToken, setResetToken] = useState('')
  const [resetPassword, setResetPassword] = useState('')
  const [resetConfirm, setResetConfirm] = useState('')
  const [resetStatus, setResetStatus] = useState(null)
  const [isResetting, setIsResetting] = useState(false)

  // ── Sayfa açılınca kullanıcı adı input'una fokusla ────────────────────────
  useEffect(() => {
    usernameRef.current?.focus()
  }, [])

  // ── Giriş başarılıysa yönlendir ───────────────────────────────────────────
  useEffect(() => {
    if (isAuthenticated) navigate('/')
  }, [isAuthenticated, navigate])

  // ── Cihaz kimliğini yükle ─────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true
    ipc.settingsGet('install_id').then((result) => {
      if (mounted && result.success) setDeviceId(result.data ?? '')
    })
    return () => { mounted = false }
  }, [])

  // ── Timer temizliği ───────────────────────────────────────────────────────
  useEffect(() => () => clearTimeout(copyTimerRef.current), [])

  // ── Handler'lar ───────────────────────────────────────────────────────────

  const handleSubmit = useCallback(async (event) => {
    event.preventDefault()
    await login(username, password)
  }, [login, username, password])

  const handleCopy = useCallback(() => {
    if (!deviceId) return
    navigator.clipboard.writeText(deviceId)
    setCopySuccess(true)
    clearTimeout(copyTimerRef.current)
    copyTimerRef.current = setTimeout(() => setCopySuccess(false), COPY_RESET_MS)
  }, [deviceId])

  const handleOpenReset = useCallback(() => {
    setIsResetOpen(true)
    setResetStatus(null)
  }, [])

  const handleCloseReset = useCallback(() => {
    setIsResetOpen(false)
  }, [])

  const handleResetSubmit = useCallback(async (event) => {
    event.preventDefault()
    setResetStatus(null)

    if (resetPassword !== resetConfirm) {
      setResetStatus({ type: 'danger', message: 'Şifreler eşleşmiyor.' })
      return
    }

    setIsResetting(true)
    const result = await ipc.authResetWithToken({
      token: resetToken.trim(),
      newPassword: resetPassword,
    })
    setIsResetting(false)

    if (result.success) {
      setResetStatus({
        type: 'success',
        message: `Şifre sıfırlandı. Kullanıcı adınız: ${result.username} — giriş yapabilirsiniz.`,
      })
      setResetToken('')
      setResetPassword('')
      setResetConfirm('')
      return
    }

    setResetStatus({ type: 'danger', message: result.error || 'İşlem başarısız.' })
  }, [resetToken, resetPassword, resetConfirm])

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen items-center justify-center px-4">

      {/* ── Giriş kartı ── */}
      <div className="w-full max-w-md animate-[fadeInUp_0.6s_ease] rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-8 shadow-[var(--shadow-soft)] backdrop-blur-xl">

        <div className="text-center">
          <div className="text-xs uppercase tracking-[0.4em] text-[var(--text-muted)]">
            Cilt Dijital Kayıt Sistemi
          </div>
          <h1 className="mt-4 text-3xl">Güvenli Giriş</h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Arşivini güvenle yönetmek için giriş yap.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
          <label className="text-xs text-[var(--text-muted)]">
            Kullanıcı Adı
            <input
              ref={usernameRef}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              className={inputClass}
              required
            />
          </label>

          <label className="text-xs text-[var(--text-muted)]">
            Şifre
            <div className="mt-2 flex items-center gap-2 rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 focus-within:border-[var(--accent)] transition">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="flex-1 bg-transparent text-sm text-[var(--text-primary)] outline-none"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="rounded-md px-2 py-1 text-xs text-[var(--text-muted)] transition hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
              >
                {showPassword ? 'Gizle' : 'Göster'}
              </button>
            </div>
          </label>

          {error && (
            <AlertMessage variant="danger" title="Giriş başarısız" className="text-xs">
              {error}
            </AlertMessage>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="mt-2 flex items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm text-white transition hover:bg-[var(--accent-hover)] disabled:opacity-60"
          >
            {isLoading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
          </button>

          <button
            type="button"
            onClick={handleOpenReset}
            className="text-xs text-[var(--text-muted)] transition hover:text-[var(--text-primary)]"
          >
            Şifremi Unuttum
          </button>
        </form>

        {/* Cihaz kimliği */}
        {deviceId && (
          <div className="mt-6 flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-xs text-[var(--text-muted)]">
            <div>
              Cihaz Kimliği:{' '}
              <span className="text-[var(--text-primary)]">{deviceId}</span>
            </div>
            <button
              type="button"
              onClick={handleCopy}
              title="Kimliği Kopyala"
              className="ml-3 flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-2 py-1 text-xs text-[var(--text-muted)] transition hover:border-[var(--accent)] hover:text-[var(--text-primary)]"
            >
              {copySuccess ? (
                <><CheckIcon /><span className="text-[var(--success)]">Kopyalandı</span></>
              ) : (
                <CopyIcon />
              )}
            </button>
          </div>
        )}
      </div>

      {/* ── Şifre sıfırlama modalı ── */}
      {isResetOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          onKeyDown={(e) => e.key === 'Escape' && handleCloseReset()}
        >
          <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg">Kurtarma Kodu ile Şifre Sıfırla</h3>
              <button
                type="button"
                onClick={handleCloseReset}
                className="rounded-lg border border-[var(--border)] px-3 py-1 text-xs text-[var(--text-muted)] transition hover:border-[var(--accent)] hover:text-[var(--text-primary)]"
              >
                Kapat
              </button>
            </div>

            <form onSubmit={handleResetSubmit} className="flex flex-col gap-3">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-3 text-xs text-[var(--text-muted)]">
                Destek ekibine cihaz kimliğini iletip bu cihaza özel 24 saatlik şifre
                sıfırlama tokeni isteyin.
                {deviceId && (
                  <div className="mt-2">
                    Cihaz Kimliği:{' '}
                    <span className="break-all text-[var(--text-primary)]">{deviceId}</span>
                  </div>
                )}
              </div>

              <label className="text-xs text-[var(--text-muted)]">
                Kurtarma Tokeni
                <input
                  value={resetToken}
                  onChange={(e) => setResetToken(e.target.value)}
                  className={inputClass}
                  required
                />
              </label>
              <label className="text-xs text-[var(--text-muted)]">
                Yeni Şifre
                <input
                  type="password"
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  autoComplete="new-password"
                  className={inputClass}
                  required
                />
              </label>
              <label className="text-xs text-[var(--text-muted)]">
                Yeni Şifre Tekrar
                <input
                  type="password"
                  value={resetConfirm}
                  onChange={(e) => setResetConfirm(e.target.value)}
                  autoComplete="new-password"
                  className={inputClass}
                  required
                />
              </label>

              {resetStatus && (
                <AlertMessage
                  variant={resetStatus.type === 'danger' ? 'danger' : 'success'}
                  title={resetStatus.type === 'danger' ? 'İşlem başarısız' : 'İşlem başarılı'}
                  className="text-xs"
                >
                  {resetStatus.message}
                </AlertMessage>
              )}

              <button
                type="submit"
                disabled={isResetting}
                className="mt-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm text-white transition hover:bg-[var(--accent-hover)] disabled:opacity-60"
              >
                {isResetting ? 'Sıfırlanıyor...' : 'Şifreyi Sıfırla'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}