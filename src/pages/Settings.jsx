import { useEffect, useState } from 'react'
import useSettingsStore from '../store/useSettingsStore.js'
import { ipc } from '../utils/ipc.js'
import AlertMessage from '../components/shared/AlertMessage.jsx'

export default function Settings() {
  const storagePath = useSettingsStore((state) => state.storagePath)
  const fetchStoragePath = useSettingsStore((state) => state.fetchStoragePath)
  const chooseStoragePath = useSettingsStore((state) => state.chooseStoragePath)
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
    let isMounted = true

    const loadUsername = async () => {
      const result = await ipc.settingsGet('auth_username')
      if (isMounted && result.success) {
        setCurrentUsername(result.data || '')
      }
    }

    loadUsername()

    return () => {
      isMounted = false
    }
  }, [])

  const handleChooseStoragePath = async () => {
    const result = await chooseStoragePath()
    if (result.canceled) {
      return
    }

    setStatus({
      type: result.success ? 'success' : 'danger',
      message: result.success
        ? 'Depolama klasörü güncellendi.'
        : result.error,
    })
  }

  const handleCredentialChange = async (event) => {
    event.preventDefault()
    if (credentials.newPassword !== credentials.confirmPassword) {
      setStatus({
        type: 'danger',
        message: 'Yeni şifreler eşleşmiyor.',
      })
      return
    }
    if (credentials.newPassword.length < 4) {
      setStatus({
        type: 'danger',
        message: 'Şifre en az 4 karakter olmalı.',
      })
      return
    }

    const result = await ipc.authChange({
      currentPassword: credentials.currentPassword,
      newUsername: credentials.newUsername,
      newPassword: credentials.newPassword,
    })

    if (result.success) {
      setCurrentUsername(credentials.newUsername)
      setCredentials({
        currentPassword: '',
        newUsername: credentials.newUsername,
        newPassword: '',
        confirmPassword: '',
      })
      setStatus({
        type: 'success',
        message: 'Kimlik bilgileri güncellendi.',
      })
    } else {
      setStatus({
        type: 'danger',
        message: result.error,
      })
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
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Varsayılan konum aktif Windows kullanıcısının Belgeler klasörüdür.
        </p>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            value={storagePath || ''}
            readOnly
            className="flex-1 rounded-lg border border-[var(--border)] bg-[rgba(255,255,255,0.02)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none"
          />
          <button
            type="button"
            onClick={handleChooseStoragePath}
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
          Mevcut kullanıcı adı:{' '}
          <span className="text-[var(--text-primary)]">{currentUsername || '-'}</span>
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
        <AlertMessage
          variant={status.type}
          title={status.type === 'danger' ? 'İşlem tamamlanamadı' : 'İşlem başarılı'}
        >
          {status.message}
        </AlertMessage>
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
