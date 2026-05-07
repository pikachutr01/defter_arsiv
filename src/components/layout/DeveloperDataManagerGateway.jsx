import { useEffect, useState, useCallback } from 'react'
import Modal from '../shared/Modal.jsx'
import AlertMessage from '../shared/AlertMessage.jsx'
import { ipc } from '../../utils/ipc.js'
import DeveloperDataManager from '../developer/DeveloperDataManager.jsx'

// ─── Constants ───────────────────────────────────────────────────────────────

const SHORTCUT = { ctrlKey: true, shiftKey: true, key: 'b' }

// ─── Component ───────────────────────────────────────────────────────────────

export default function DeveloperDataManagerGateway() {
  const [isOpen, setIsOpen] = useState(false)
  const [token, setToken] = useState('')
  const [status, setStatus] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [authorizedUntil, setAuthorizedUntil] = useState(null)
  const [context, setContext] = useState(null)

  // Klavye kısayolu
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey === SHORTCUT.ctrlKey && e.shiftKey === SHORTCUT.shiftKey &&
        String(e.key).toLowerCase() === SHORTCUT.key) {
        e.preventDefault()
        setIsOpen(true)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Modal açıldığında cihaz bağlamını yükle
  useEffect(() => {
    if (!isOpen) return
    let cancelled = false
    ipc.settingsGetDeveloperResetContext().then((result) => {
      if (!cancelled && result.success) setContext(result.data)
    })
    return () => { cancelled = true }
  }, [isOpen])

  const resetAndClose = useCallback(() => {
    setIsOpen(false)
    setToken('')
    setStatus(null)
    setIsSubmitting(false)
    setAuthorizedUntil(null)
  }, [])

  const handleCopyDeviceId = useCallback(async () => {
    if (!context?.deviceId || !navigator?.clipboard?.writeText) {
      setStatus({ type: 'danger', message: 'Cihaz kimliği kopyalanamadı.' })
      return
    }
    try {
      await navigator.clipboard.writeText(context.deviceId)
      setStatus({ type: 'success', message: 'Cihaz kimliği panoya kopyalandı.' })
    } catch {
      setStatus({ type: 'danger', message: 'Cihaz kimliği kopyalanamadı.' })
    }
  }, [context?.deviceId])

  const handleAuthorize = useCallback(async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setStatus(null)

    const result = await ipc.authAuthorizeDeveloperReset({ token: token.trim() })
    setIsSubmitting(false)

    if (!result.success) {
      setStatus({ type: 'danger', message: result.error || 'Token doğrulanamadı.' })
      return
    }

    setAuthorizedUntil(result.data?.expiresAt ?? null)
  }, [token])

  if (!isOpen) return null

  if (authorizedUntil) {
    return <DeveloperDataManager onClose={resetAndClose} />
  }

  return (
    <Modal
      title="Geliştirici Veri Yöneticisi Doğrulaması"
      onClose={resetAndClose}
      panelClassName="max-w-xl z-[9999]"
    >
      <div className="space-y-4">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-4 text-sm text-[var(--text-muted)]">
          Bu alan gizli bir geliştirici veri yöneticisidir. Erişmek için destek ekibinden{' '}
          <code>developer_reset</code> yetkisine sahip bir token almalısınız.
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-4">
          <p className="text-xs uppercase tracking-[0.24em] text-[var(--text-muted)]">
            Cihaz Kimliği
          </p>
          <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <code className="break-all rounded-xl bg-[var(--bg-elevated)] px-3 py-2 text-xs text-[var(--text-primary)]">
              {context?.deviceId ?? 'Yükleniyor...'}
            </code>
            <button
              type="button"
              onClick={handleCopyDeviceId}
              disabled={!context?.deviceId}
              className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs text-[var(--text-muted)] transition hover:border-[var(--accent)] hover:text-[var(--text-primary)] disabled:opacity-50"
            >
              Kimliği Kopyala
            </button>
          </div>
        </div>

        <form onSubmit={handleAuthorize} className="space-y-4">
          <label className="block text-xs text-[var(--text-muted)]">
            Geliştirici Tokeni
            <textarea
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="mt-2 min-h-28 w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-sm text-[var(--text-primary)] outline-none"
              placeholder="developer_reset tokenini yapıştırın"
              required
            />
          </label>

          {status && (
            <AlertMessage
              variant={status.type}
              title={status.type === 'danger' ? 'Hata' : 'Başarılı'}
            >
              {status.message}
            </AlertMessage>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={resetAndClose}
              className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm transition hover:bg-[var(--bg-elevated)]"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm text-white transition hover:bg-[var(--accent-hover)] disabled:opacity-60"
            >
              {isSubmitting ? 'Doğrulanıyor...' : 'Tokeni Doğrula'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  )
}