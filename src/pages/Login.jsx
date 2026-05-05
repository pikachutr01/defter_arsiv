import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../store/useAuthStore.js'
import AlertMessage from '../components/shared/AlertMessage.jsx'

export default function Login() {
  const login = useAuthStore((state) => state.login)
  const isLoading = useAuthStore((state) => state.isLoading)
  const error = useAuthStore((state) => state.error)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const navigate = useNavigate()
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    await login(username, password)
  }

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/')
    }
  }, [isAuthenticated, navigate])

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
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
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="mt-2 w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm text-[var(--text-primary)] outline-none"
              required
            />
          </label>
          <label className="text-xs text-[var(--text-muted)]">
            Şifre
            <div className="mt-2 flex items-center gap-2 rounded-lg border border-[var(--border)] bg-transparent px-3 py-2">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="flex-1 bg-transparent text-sm text-[var(--text-primary)] outline-none"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="rounded-md px-2 py-1 text-xs text-[var(--text-muted)] transition hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
              >
                {showPassword ? 'Gizle' : 'Göster'}
              </button>
            </div>
          </label>
          {error ? (
            <AlertMessage variant="danger" title="Giriş başarısız" className="text-xs">
              {error}
            </AlertMessage>
          ) : null}
          <button
            type="submit"
            disabled={isLoading}
            className="mt-2 flex items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm text-white transition hover:bg-[var(--accent-hover)]"
          >
            {isLoading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
          </button>
        </form>
      </div>
    </div>
  )
}
