import { useEffect, useMemo, useState } from 'react'
import Modal from '../shared/Modal.jsx'
import AlertMessage from '../shared/AlertMessage.jsx'
import { ipc } from '../../utils/ipc.js'

const INITIAL_OPTIONS = {
  resetDatabase: true,
  clearStorage: false,
}

const formatDateTime = (value) => {
  if (!value) return '-'

  try {
    return new Intl.DateTimeFormat('tr-TR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(value))
  } catch {
    return String(value)
  }
}

export default function DeveloperResetGateway() {
  const [isOpen, setIsOpen] = useState(false)
  const [token, setToken] = useState('')
  const [status, setStatus] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isScheduling, setIsScheduling] = useState(false)
  const [context, setContext] = useState(null)
  const [authorizedUntil, setAuthorizedUntil] = useState(null)
  const [options, setOptions] = useState(INITIAL_OPTIONS)

  useEffect(() => {
    const handleKeyDown = (event) => {
      const key = String(event.key || '').toLowerCase()
      if (event.ctrlKey && event.shiftKey && key === 'l') {
        event.preventDefault()
        setIsOpen(true)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    if (!isOpen) return

    let isMounted = true
    const loadContext = async () => {
      const result = await ipc.settingsGetDeveloperResetContext()
      if (isMounted && result.success) {
        setContext(result.data)
      }
    }

    loadContext()
    return () => {
      isMounted = false
    }
  }, [isOpen])

  const resetAndClose = () => {
    setIsOpen(false)
    setToken('')
    setStatus(null)
    setIsSubmitting(false)
    setIsScheduling(false)
    setAuthorizedUntil(null)
    setOptions(INITIAL_OPTIONS)
  }

  const handleCopyDeviceId = async () => {
    if (!context?.deviceId || !navigator?.clipboard?.writeText) {
      setStatus({ type: 'danger', message: 'Cihaz kimliği bu ortamda kopyalanamadı.' })
      return
    }

    try {
      await navigator.clipboard.writeText(context.deviceId)
      setStatus({ type: 'success', message: 'Cihaz kimliği panoya kopyalandı.' })
    } catch {
      setStatus({ type: 'danger', message: 'Cihaz kimliği kopyalanamadı.' })
    }
  }

  const handleAuthorize = async (event) => {
    event.preventDefault()
    setIsSubmitting(true)
    setStatus(null)

    const result = await ipc.authAuthorizeDeveloperReset({ token: token.trim() })
    setIsSubmitting(false)

    if (!result.success) {
      setStatus({ type: 'danger', message: result.error || 'Token doğrulanamadı.' })
      return
    }

    setAuthorizedUntil(result.data?.expiresAt || null)
    setStatus({
      type: 'success',
      message: 'Token doğrulandı. Sıfırlama seçenekleri açıldı.',
    })
  }

  const handleSchedule = async (event) => {
    event.preventDefault()
    setIsScheduling(true)
    setStatus(null)

    const result = await ipc.settingsScheduleDeveloperReset(options)
    if (!result.success) {
      setIsScheduling(false)
      setStatus({ type: 'danger', message: result.error || 'Sıfırlama planlanamadı.' })
      return
    }

    setStatus({
      type: 'success',
      message: 'Sıfırlama planlandı. Uygulama yeniden başlatılıyor.',
    })
  }

  const selectedCount = useMemo(
    () => Object.values(options).filter(Boolean).length,
    [options]
  )

  return isOpen ? (
    <Modal
      title={authorizedUntil ? 'Geliştirici Sıfırlama' : 'Geliştirici Sıfırlama Doğrulaması'}
      onClose={resetAndClose}
      panelClassName="max-w-2xl"
    >
      <div className="space-y-4">
        {!authorizedUntil ? (
          <>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-4 text-sm text-[var(--text-muted)]">
              Bu alan gizli bir geliştirici kurtarma kapısıdır. Sıfırlama seçeneklerini görmek
              için destek ekibinden bu cihaza özel, 1 saat geçerli `developer_reset` tokeni
              istemelisiniz.
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-4">
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--text-muted)]">
                Cihaz Kimliği
              </p>
              <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <code className="break-all rounded-xl bg-[var(--bg-elevated)] px-3 py-2 text-xs text-[var(--text-primary)]">
                  {context?.deviceId || 'Yükleniyor...'}
                </code>
                <button
                  type="button"
                  onClick={handleCopyDeviceId}
                  className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs text-[var(--text-muted)] transition hover:border-[var(--accent)] hover:text-[var(--text-primary)]"
                >
                  Kimliği Kopyala
                </button>
              </div>
            </div>

            <form onSubmit={handleAuthorize} className="space-y-4">
              <label className="block text-xs text-[var(--text-muted)]">
                Geliştirici Reset Tokeni
                <textarea
                  value={token}
                  onChange={(event) => setToken(event.target.value)}
                  className="mt-2 min-h-28 w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-sm text-[var(--text-primary)] outline-none"
                  placeholder="Destek ekibinden gelen developer_reset tokenini yapıştırın"
                  required
                />
              </label>

              {status ? (
                <AlertMessage
                  variant={status.type === 'danger' ? 'danger' : 'success'}
                  title={status.type === 'danger' ? 'Doğrulama Başarısız' : 'Doğrulama Başarılı'}
                >
                  {status.message}
                </AlertMessage>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm text-white transition hover:bg-[var(--accent-hover)] disabled:opacity-60"
              >
                {isSubmitting ? 'Doğrulanıyor...' : 'Tokeni Doğrula'}
              </button>
            </form>
          </>
        ) : (
          <>
            <AlertMessage variant="success" title="Yetki Aktif">
              Token doğrulandı. Yetki bitişi: {formatDateTime(authorizedUntil)}
            </AlertMessage>

            <div className="grid gap-3 text-xs text-[var(--text-muted)] md:grid-cols-2">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3">
                <p className="font-semibold text-[var(--text-primary)]">AppData kök dizini</p>
                <p className="mt-2 break-all">{context?.userDataPath || '-'}</p>
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3">
                <p className="font-semibold text-[var(--text-primary)]">İç veri dizini</p>
                <p className="mt-2 break-all">{context?.internalDataPath || '-'}</p>
              </div>
            </div>

            <form onSubmit={handleSchedule} className="space-y-4">
              <div className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-4">
                <label className="flex items-start gap-3 text-sm text-[var(--text-primary)]">
                  <input
                    type="checkbox"
                    checked={options.resetDatabase}
                    onChange={(event) =>
                      setOptions((current) => ({
                        ...current,
                        resetDatabase: event.target.checked,
                      }))
                    }
                    className="mt-1"
                  />
                  <span>
                    Veritabanını sıfırla
                    <span className="mt-1 block text-xs text-[var(--text-muted)]">
                      `database.sqlite`, `-wal` ve `-shm` dahil iç veri dizini yeniden oluşturulur.
                    </span>
                  </span>
                </label>

                <label className="flex items-start gap-3 text-sm text-[var(--text-primary)]">
                  <input
                    type="checkbox"
                    checked={options.clearStorage}
                    onChange={(event) =>
                      setOptions((current) => ({
                        ...current,
                        clearStorage: event.target.checked,
                      }))
                    }
                    className="mt-1"
                  />
                  <span>
                    Görsel depolama klasörünü temizle
                    <span className="mt-1 block break-all text-xs text-[var(--text-muted)]">
                      {context?.storagePath || 'Depolama yolu bulunamadı.'}
                    </span>
                  </span>
                </label>

              </div>

              <AlertMessage title="Dikkat">
                Seçilen {selectedCount} işlem, uygulama kapatılıp yeniden açılırken uygulanır.
                Bu yaklaşım açık veritabanı dosyalarını çalışma anında silmeye çalışmadığı için
                daha güvenlidir.
              </AlertMessage>

              {status ? (
                <AlertMessage
                  variant={status.type === 'danger' ? 'danger' : 'success'}
                  title={status.type === 'danger' ? 'İşlem Başarısız' : 'İşlem Hazır'}
                >
                  {status.message}
                </AlertMessage>
              ) : null}

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={isScheduling || selectedCount === 0}
                  className="rounded-lg bg-[var(--danger-strong)] px-4 py-2 text-sm text-white transition hover:opacity-90 disabled:opacity-60"
                >
                  {isScheduling ? 'Planlanıyor...' : 'Sıfırlamayı Planla ve Yeniden Başlat'}
                </button>
                <button
                  type="button"
                  onClick={resetAndClose}
                  className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-[var(--text-muted)] transition hover:border-[var(--accent)] hover:text-[var(--text-primary)]"
                >
                  Vazgeç
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </Modal>
  ) : null
}
