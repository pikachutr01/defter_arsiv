import { useEffect, useState } from 'react'
import useSettingsStore from '../store/useSettingsStore.js'
import { ipc } from '../utils/ipc.js'

export default function Settings() {
  const { storagePath, fetchStoragePath, setStoragePath } = useSettingsStore(
    (state) => ({
      storagePath: state.storagePath,
      fetchStoragePath: state.fetchStoragePath,
      setStoragePath: state.setStoragePath,
    })
  )
  const [storageInput, setStorageInput] = useState('')
  const [credentials, setCredentials] = useState({
    currentPassword: '',
    newUsername: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [status, setStatus] = useState(null)
  const [currentUsername, setCurrentUsername] = useState('')

  useEffect(() => {
    fetchStoragePath()
  }, [fetchStoragePath])

  useEffect(() => {
    const loadUsername = async () => {
      const result = await ipc.settingsGet('auth_username')
      if (result.success) {
        setCurrentUsername(result.data || '')
      }
    }
    loadUsername()
  }, [])

  useEffect(() => {
    setStorageInput(storagePath || '')
  }, [storagePath])

  const handleStorageChange = async () => {
    const result = await setStoragePath(storageInput)
    setStatus(result.success ? 'Depolama yolu güncellendi.' : result.error)
  }

  const handleCredentialChange = async (event) => {
    event.preventDefault()
    if (credentials.newPassword !== credentials.confirmPassword) {
      setStatus('Yeni şifreler eşleşmiyor.')
      return
    }
    if (credentials.newPassword.length < 4) {
      setStatus('Şifre en az 4 karakter olmalı.')
      return
    }
    const result = await ipc.authChange({
      currentPassword: credentials.currentPassword,
      newUsername: credentials.newUsername,
      newPassword: credentials.newPassword,
    })
    if (result.success) {
      setCurrentUsername(credentials.newUsername)
      setStatus('Kimlik bilgileri güncellendi.')
    } else {
      setStatus(result.error)
    }
  }

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl">Ayarlar</h2>
        <p className="text-sm text-[var(--text-muted)]">
          Depolama ve kimlik bilgilerini buradan yönet.
        </p>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
        <h3 className="text-lg">Depolama Klasörü</h3>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            value={storageInput}
            onChange={(event) => setStorageInput(event.target.value)}
            className="flex-1 rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm text-[var(--text-primary)]"
          />
          <button
            type="button"
            onClick={handleStorageChange}
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm text-white"
          >
            Değiştir
          </button>
        </div>
      </div>

      <form
        onSubmit={handleCredentialChange}
        className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6"
      >
        <h3 className="text-lg">Kimlik Bilgileri</h3>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Mevcut kullanıcı adı: <span className="text-[var(--text-primary)]">{currentUsername || '-'}</span>
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-xs text-[var(--text-muted)]">
            Mevcut Şifre
            <input
              type="password"
              value={credentials.currentPassword}
              onChange={(event) =>
                setCredentials((prev) => ({
                  ...prev,
                  currentPassword: event.target.value,
                }))
              }
              className="mt-2 w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm text-[var(--text-primary)]"
              required
            />
          </label>
          <label className="text-xs text-[var(--text-muted)]">
            Yeni Kullanıcı Adı
            <input
              value={credentials.newUsername}
              onChange={(event) =>
                setCredentials((prev) => ({
                  ...prev,
                  newUsername: event.target.value,
                }))
              }
              className="mt-2 w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm text-[var(--text-primary)]"
              required
            />
          </label>
          <label className="text-xs text-[var(--text-muted)]">
            Yeni Şifre
            <input
              type="password"
              value={credentials.newPassword}
              onChange={(event) =>
                setCredentials((prev) => ({
                  ...prev,
                  newPassword: event.target.value,
                }))
              }
              className="mt-2 w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm text-[var(--text-primary)]"
              required
            />
          </label>
          <label className="text-xs text-[var(--text-muted)]">
            Yeni Şifre Tekrar
            <input
              type="password"
              value={credentials.confirmPassword}
              onChange={(event) =>
                setCredentials((prev) => ({
                  ...prev,
                  confirmPassword: event.target.value,
                }))
              }
              className="mt-2 w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm text-[var(--text-primary)]"
              required
            />
          </label>
        </div>
        <button
          type="submit"
          className="mt-4 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm text-white"
        >
          Kaydet
        </button>
      </form>

      {status ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 text-sm text-[var(--text-muted)]">
          {status}
        </div>
      ) : null}

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
        <h3 className="text-lg">Yedekleme</h3>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => ipc.archiveExport()}
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-[var(--text-primary)]"
          >
            Tam Yedek Al
          </button>
          <button
            type="button"
            onClick={() => ipc.archiveImport()}
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-[var(--text-primary)]"
          >
            Yedekten Geri Yükle
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
        <h3 className="text-lg">Hakkında</h3>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Cilt Dijital Kayıt Sistemi, kişisel cilt fotoğraflarını hızlı ve güvenli
          şekilde yönetmek için tasarlanmıştır.
        </p>
      </div>
    </section>
  )
}
