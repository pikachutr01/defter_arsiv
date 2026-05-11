import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import useSettingsStore from '../store/useSettingsStore.js'
import { ipc } from '../utils/ipc.js'
import AlertMessage from '../components/shared/AlertMessage.jsx'
import ImageViewer from '../components/images/ImageViewer.jsx'
import ConfirmDialog from '../components/shared/ConfirmDialog.jsx'
import { toLocalAssetUrl } from '../utils/paths.js'

const PREVIEW_LIMIT = 500

const formatSideLabel = (side) =>
  side === 'A' ? 'Sol Taraf' : side === 'B' ? 'Sağ Taraf' : side

const pageKey = (item) => `${item.pageId}:${item.side}`

const formatBytes = (bytes, decimals = 2) => {
  if (!+bytes) return '0 Bayt'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bayt', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

export default function Settings() {
  const location = useLocation()
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
  const [imageQuality, setImageQuality] = useState(80)
  const [autoRotate, setAutoRotate] = useState('off')
  const [scanResult, setScanResult] = useState(null)
  const [scanStatus, setScanStatus] = useState(null)
  const [scanError, setScanError] = useState(null)
  const [isScanning, setIsScanning] = useState(false)
  const [selectedExtra, setSelectedExtra] = useState(new Set())
  const [selectedMissingCovers, setSelectedMissingCovers] = useState(new Set())
  const [selectedMissingPages, setSelectedMissingPages] = useState(new Set())
  const [viewerImagePath, setViewerImagePath] = useState(null)
  const [confirmDeleteExtras, setConfirmDeleteExtras] = useState(null)
  const [confirmClearMissing, setConfirmClearMissing] = useState(null)
  const [storageStats, setStorageStats] = useState({ totalSize: 0, fileCount: 0 })

  useEffect(() => {
    let isMounted = true
    const loadStats = async () => {
      const result = await ipc.settingsGetStorageStats()
      if (isMounted && result.success) {
        setStorageStats(result.data)
      }
    }
    if (storagePath) {
      loadStats()
    }
    return () => {
      isMounted = false
    }
  }, [storagePath])

  useEffect(() => {
    if (location.state?.storageError) {
      setTimeout(() => {
        setStatus({
          type: 'danger',
          message: 'Geçerli depolama klasörüne erişilemiyor. Çıkarılabilir diskinizi kontrol edin veya yeni bir klasör seçin.',
        })
      }, 0)
      window.history.replaceState({}, document.title)
    }
  }, [location.state])

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
    const loadQuality = async () => {
      const result = await ipc.settingsGet('image_quality')
      if (isMounted && result.success && result.data) {
        setImageQuality(parseInt(result.data, 10))
      }
    }
    const loadAutoRotate = async () => {
      const result = await ipc.settingsGet('upload_auto_rotate')
      if (isMounted && result.success && result.data) {
        setAutoRotate(result.data)
      }
    }
    loadUsername()
    loadQuality()
    loadAutoRotate()
    return () => {
      isMounted = false
    }
  }, [])

  const fileExtras = useMemo(() => scanResult?.fileExtras || [], [scanResult])
  const missingCovers = useMemo(() => scanResult?.dbMissing?.covers || [], [scanResult])
  const missingPages = useMemo(() => scanResult?.dbMissing?.pages || [], [scanResult])

  const hasFileExtras = fileExtras.length > 0
  const hasMissingRefs = missingCovers.length > 0 || missingPages.length > 0

  const selectedMissingPagesList = useMemo(
    () =>
      missingPages
        .filter((item) => selectedMissingPages.has(pageKey(item)))
        .map((item) => ({ pageId: item.pageId, side: item.side })),
    [missingPages, selectedMissingPages]
  )

  const resetSelections = useCallback(() => {
    setSelectedExtra(new Set())
    setSelectedMissingCovers(new Set())
    setSelectedMissingPages(new Set())
  }, [])

  const runIntegrityScan = useCallback(async () => {
    setIsScanning(true)
    setScanError(null)
    setScanStatus(null)
    const result = await ipc.settingsScanStorageIntegrity({ previewLimit: PREVIEW_LIMIT })
    setIsScanning(false)
    if (result.success) {
      setScanResult(result.data)
      setScanStatus({ type: 'success', message: 'Tarama tamamlandı.' })
      resetSelections()
      return
    }
    setScanError(result.error || 'Tarama başarısız.')
  }, [resetSelections])

  const handleDeleteExtras = useCallback(
    async (paths) => {
      if (!paths.length) return
      const result = await ipc.settingsDeleteOrphanFiles({ paths })
      if (result.success) {
        setScanStatus({
          type: 'success',
          message: `${result.data?.removed || paths.length} dosya silindi.`,
        })
        await runIntegrityScan()
        return
      }
      setScanError(result.error || 'Dosyalar silinemedi.')
    },
    [runIntegrityScan]
  )

  const handleClearMissingRefs = useCallback(
    async (payload) => {
      const hasCovers = payload.covers?.length
      const hasPages = payload.pages?.length
      if (!hasCovers && !hasPages) return
      const result = await ipc.settingsClearMissingRefs(payload)
      if (result.success) {
        setScanStatus({ type: 'success', message: 'Eksik kayıtlar temizlendi.' })
        await runIntegrityScan()
        return
      }
      setScanError(result.error || 'Kayıtlar temizlenemedi.')
    },
    [runIntegrityScan]
  )

  const handleChooseStoragePath = useCallback(async () => {
    const result = await chooseStoragePath()
    if (result.canceled) return
    setStatus({
      type: result.success ? 'success' : 'danger',
      message: result.success ? 'Depolama klasörü güncellendi.' : result.error,
    })
  }, [chooseStoragePath])

  const handleCredentialChange = useCallback(
    async (event) => {
      event.preventDefault()
      if (credentials.newPassword !== credentials.confirmPassword) {
        setStatus({ type: 'danger', message: 'Yeni şifreler eşleşmiyor.' })
        return
      }
      if (credentials.newPassword.length < 4) {
        setStatus({ type: 'danger', message: 'Şifre en az 4 karakter olmalı.' })
        return
      }
      const result = await ipc.authChange({
        currentPassword: credentials.currentPassword,
        newUsername: credentials.newUsername,
        newPassword: credentials.newPassword,
      })
      if (result.success) {
        setCurrentUsername(credentials.newUsername)
        setCredentials((prev) => ({
          ...prev,
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        }))
        setStatus({ type: 'success', message: 'Kimlik bilgileri güncellendi.' })
      } else {
        setStatus({ type: 'danger', message: result.error })
      }
    },
    [credentials]
  )

  const handleQualityChange = useCallback(async (event) => {
    const val = parseInt(event.target.value, 10)
    setImageQuality(val)
    await ipc.settingsSet('image_quality', val)
  }, [])

  const handleAutoRotateToggle = useCallback(async () => {
    const next = autoRotate === 'off' ? 'left' : 'off'
    setAutoRotate(next)
    await ipc.settingsSet('upload_auto_rotate', next)
  }, [autoRotate])

  const handleAutoRotateDirection = useCallback(async (dir) => {
    setAutoRotate(dir)
    await ipc.settingsSet('upload_auto_rotate', dir)
  }, [])

  const handleCredentialFieldChange = useCallback((event) => {
    const { name, value } = event.target
    setCredentials((prev) => ({ ...prev, [name]: value }))
  }, [])

  const handleToggleExtra = useCallback((path) => {
    setSelectedExtra((prev) => {
      const next = new Set(prev)
      next.has(path) ? next.delete(path) : next.add(path)
      return next
    })
  }, [])

  const handleToggleMissingCover = useCallback((bookId) => {
    setSelectedMissingCovers((prev) => {
      const next = new Set(prev)
      next.has(bookId) ? next.delete(bookId) : next.add(bookId)
      return next
    })
  }, [])

  const handleToggleMissingPage = useCallback((key) => {
    setSelectedMissingPages((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }, [])

  const closeViewer = useCallback(() => setViewerImagePath(null), [])
  const cancelDeleteExtras = useCallback(() => setConfirmDeleteExtras(null), [])
  const cancelClearMissing = useCallback(() => setConfirmClearMissing(null), [])

  const allExtrasSelected = fileExtras.length > 0 && selectedExtra.size === fileExtras.length
  const allMissingCoversSelected =
    missingCovers.length > 0 && selectedMissingCovers.size === missingCovers.length
  const allMissingPagesSelected =
    missingPages.length > 0 && selectedMissingPages.size === missingPages.length

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl">Ayarlar</h2>
        <p className="text-sm text-[var(--text-muted)]">
          Depolama ve kimlik bilgilerini buradan yönet.
        </p>
      </div>

      {/* Depolama Klasörü */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-lg">Depolama Klasörü</h3>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Varsayılan konum aktif Windows kullanıcısının Belgeler klasörüdür.
            </p>
          </div>
          <div className="text-right text-xs text-[var(--text-muted)] border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 rounded-lg min-w-[140px]">
            <p><span className="font-semibold text-[var(--text-primary)]">Toplam Boyut:</span> {formatBytes(storageStats.totalSize)}</p>
            <p className="mt-1"><span className="font-semibold text-[var(--text-primary)]">Resim Sayısı:</span> {storageStats.fileCount} adet</p>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
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

      {/* Sıkıştırma Ayarları */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <h3 className="text-lg">Resim Kalitesi (Sıkıştırma)</h3>
            <span className="text-sm font-semibold text-[var(--accent)]">%{imageQuality}</span>
          </div>
          <p className="text-sm text-[var(--text-muted)]">
            Eklenen sayfaların diskte kaplayacağı boyutu ve görsel kalitesini buradan ayarlayabilirsin. Daha düşük kalite daha az yer kaplar. Varsayılan değer: %80
          </p>
          <div className="mt-4 flex items-center gap-4">
            <input
              type="range"
              min="10"
              max="100"
              step="5"
              value={imageQuality}
              onChange={handleQualityChange}
              className="w-full accent-[var(--accent)] cursor-pointer"
            />
          </div>
          <div className="flex justify-between text-xs text-[var(--text-muted)] px-1">
            <span>Düşük Boyut (%10)</span>
            <span>Yüksek Kalite (%100)</span>
          </div>
        </div>
      </div>

      {/* Yükleme Sırasında Otomatik Döndürme */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <h3 className="text-lg">Yükleme Sırasında Otomatik Döndürme</h3>
            <button
              type="button"
              onClick={handleAutoRotateToggle}
              role="switch"
              aria-checked={autoRotate !== 'off'}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 transition-colors duration-200 ${autoRotate !== 'off'
                ? 'border-[var(--accent)] bg-[var(--accent)]'
                : 'border-[var(--border)] bg-[var(--bg-card)]'
                }`}
            >
              <span
                className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${autoRotate !== 'off' ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
              />
            </button>
          </div>
          <p className="text-sm text-[var(--text-muted)]">
            Açık olduğunda, tek tek veya toplu yüklenen tüm resimler otomatik olarak belirlenen yöne döndürülecektir.
          </p>
          {autoRotate !== 'off' && (
            <div className="mt-3 flex gap-3">
              <button
                type="button"
                onClick={() => handleAutoRotateDirection('left')}
                className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${autoRotate === 'left'
                  ? 'border-[var(--accent)] bg-[var(--accent-dim)] text-[var(--accent)]'
                  : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--accent)]'
                  }`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                </svg>
                Sola Döndür (90°)
              </button>
              <button
                type="button"
                onClick={() => handleAutoRotateDirection('right')}
                className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${autoRotate === 'right'
                  ? 'border-[var(--accent)] bg-[var(--accent-dim)] text-[var(--accent)]'
                  : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--accent)]'
                  }`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12a9 9 0 1 0-9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                  <path d="M21 3v5h-5" />
                </svg>
                Sağa Döndür (90°)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Veri Bütünlüğü Taraması */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-lg">Veri Bütünlüğü Taraması</h3>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Klasördeki görselleri ve veri tabanı kayıtlarını karşılaştırır.
            </p>
          </div>
          <button
            type="button"
            onClick={runIntegrityScan}
            disabled={isScanning}
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm text-white transition hover:bg-[var(--accent-hover)] disabled:cursor-wait disabled:opacity-70"
          >
            {isScanning ? 'Taranıyor...' : 'Taramayı Başlat'}
          </button>
        </div>

        {scanError ? (
          <div className="mt-4">
            <AlertMessage variant="danger" title="Tarama başarısız">
              {scanError}
            </AlertMessage>
          </div>
        ) : null}

        {scanStatus ? (
          <div className="mt-4">
            <AlertMessage
              variant={scanStatus.type === 'danger' ? 'danger' : 'success'}
              title={scanStatus.type === 'danger' ? 'İşlem tamamlanamadı' : 'İşlem başarılı'}
            >
              {scanStatus.message}
            </AlertMessage>
          </div>
        ) : null}

        {scanResult ? (
          <div className="mt-6 space-y-6">
            {/* Özet */}
            <div
              className={`rounded-xl border px-4 py-3 text-sm ${hasFileExtras || hasMissingRefs
                ? 'border-[var(--danger-border)] bg-[var(--danger-surface-soft)] text-[var(--text-primary)]'
                : 'border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-muted)]'
                }`}
            >
              {scanResult.fileExtrasTotal} klasör kaydı veritabanında yok,{' '}
              {missingCovers.length + missingPages.length} veritabanı kaydı klasörde yok.
              {scanResult.fileExtrasTruncated ? (
                <span className="ml-2 text-[var(--text-primary)]">
                  Önizleme ilk {PREVIEW_LIMIT} kayıtla sınırlandı.
                </span>
              ) : null}
            </div>

            {/* Klasörde var, veritabanında yok */}
            <div
              className={`space-y-3 rounded-2xl border p-4 ${hasFileExtras
                ? 'border-[var(--danger-border)] bg-[var(--danger-surface-soft)]'
                : 'border-[var(--border)]'
                }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-semibold text-[var(--text-primary)]">
                    Klasörde var, veritabanında yok
                  </h4>
                  <p className="text-xs text-[var(--text-muted)]">
                    İstersen fazlalık dosyaları silebilirsin.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedExtra(
                        allExtrasSelected
                          ? new Set()
                          : new Set(fileExtras.map((item) => item.path))
                      )
                    }
                    className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs text-[var(--text-primary)]"
                  >
                    {allExtrasSelected ? 'Seçimi Temizle' : 'Tümünü Seç'}
                  </button>
                  <button
                    type="button"
                    disabled={selectedExtra.size === 0}
                    onClick={() =>
                      setConfirmDeleteExtras({ paths: Array.from(selectedExtra.values()) })
                    }
                    className="rounded-lg border border-[var(--danger-border)] px-3 py-2 text-xs text-[var(--text-primary)] transition hover:border-[var(--danger-strong)] disabled:opacity-50"
                  >
                    Seçili Dosyaları Sil
                  </button>
                </div>
              </div>

              {fileExtras.length === 0 ? (
                <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 text-sm text-[var(--text-muted)]">
                  Fazlalık dosya bulunmadı.
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {fileExtras.map((item) => {
                    const imageUrl = toLocalAssetUrl(storagePath, item.path)
                    return (
                      <article
                        key={item.path}
                        className="rounded-2xl border border-[var(--danger-border)] bg-[var(--bg-card)] p-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <label className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                            <input
                              type="checkbox"
                              checked={selectedExtra.has(item.path)}
                              onChange={() => handleToggleExtra(item.path)}
                            />
                            Seç
                          </label>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteExtras({ paths: [item.path] })}
                            className="rounded-lg border border-[var(--danger-border)] px-2.5 py-1 text-[11px] text-[var(--text-primary)] transition hover:border-[var(--danger-strong)]"
                          >
                            Sil
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => setViewerImagePath(item.path)}
                          className="mt-2 block w-full overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)]"
                        >
                          {imageUrl ? (
                            <img
                              src={imageUrl}
                              alt={item.path}
                              className="h-36 w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-36 items-center justify-center text-xs text-[var(--text-muted)]">
                              Önizleme yok
                            </div>
                          )}
                        </button>
                        <div className="mt-2 space-y-1 text-xs text-[var(--text-muted)]">
                          <p className="truncate">{item.path}</p>
                          {item.type === 'page' ? (
                            <p>
                              Cilt {item.bookId} · Sayfa {item.pageNumber} ·{' '}
                              {formatSideLabel(item.side)}
                            </p>
                          ) : item.type === 'cover' ? (
                            <p>Cilt {item.bookId} kapak</p>
                          ) : (
                            <p>Tanımlanamayan dosya</p>
                          )}
                        </div>
                      </article>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Veritabanında var, klasörde yok */}
            <div
              className={`space-y-3 rounded-2xl border p-4 ${hasMissingRefs
                ? 'border-[var(--danger-border)] bg-[var(--danger-surface-soft)]'
                : 'border-[var(--border)]'
                }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-semibold text-[var(--text-primary)]">
                    Veritabanında var, klasörde yok
                  </h4>
                  <p className="text-xs text-[var(--text-muted)]">
                    Eksik dosya kayıtlarını temizleyebilirsin.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedMissingCovers(
                        allMissingCoversSelected
                          ? new Set()
                          : new Set(missingCovers.map((item) => item.bookId))
                      )
                    }
                    className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs text-[var(--text-primary)]"
                  >
                    {allMissingCoversSelected ? 'Kapak Seçimini Temizle' : 'Kapakları Seç'}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedMissingPages(
                        allMissingPagesSelected
                          ? new Set()
                          : new Set(missingPages.map((item) => pageKey(item)))
                      )
                    }
                    className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs text-[var(--text-primary)]"
                  >
                    {allMissingPagesSelected ? 'Sayfa Seçimini Temizle' : 'Sayfaları Seç'}
                  </button>
                  <button
                    type="button"
                    disabled={
                      selectedMissingCovers.size === 0 && selectedMissingPages.size === 0
                    }
                    onClick={() =>
                      setConfirmClearMissing({
                        covers: Array.from(selectedMissingCovers.values()),
                        pages: selectedMissingPagesList,
                      })
                    }
                    className="rounded-lg border border-[var(--danger-border)] px-3 py-2 text-xs text-[var(--text-primary)] transition hover:border-[var(--danger-strong)] disabled:opacity-50"
                  >
                    Seçili Kayıtları Temizle
                  </button>
                </div>
              </div>

              {missingCovers.length === 0 && missingPages.length === 0 ? (
                <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 text-sm text-[var(--text-muted)]">
                  Eksik dosya kaydı bulunmadı.
                </div>
              ) : (
                <div className="grid gap-3 lg:grid-cols-2">
                  <div className="rounded-2xl border border-[var(--danger-border)] bg-[var(--bg-card)] p-3">
                    <h5 className="text-xs font-semibold text-[var(--text-primary)]">
                      Kapak Kayıtları
                    </h5>
                    {missingCovers.length === 0 ? (
                      <p className="mt-2 text-xs text-[var(--text-muted)]">
                        Eksik kapak kaydı yok.
                      </p>
                    ) : (
                      <div className="mt-2 space-y-2">
                        {missingCovers.map((item) => (
                          <label
                            key={`cover-${item.bookId}`}
                            className="flex items-start gap-2 rounded-lg border border-[var(--danger-border)] px-3 py-2 text-xs text-[var(--text-muted)]"
                          >
                            <input
                              type="checkbox"
                              checked={selectedMissingCovers.has(item.bookId)}
                              onChange={() => handleToggleMissingCover(item.bookId)}
                            />
                            <span>
                              Cilt {item.bookId} {item.bookName ? `· ${item.bookName}` : ''}
                              <span className="block truncate text-[11px]">{item.path}</span>
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="rounded-2xl border border-[var(--danger-border)] bg-[var(--bg-card)] p-3">
                    <h5 className="text-xs font-semibold text-[var(--text-primary)]">
                      Sayfa Kayıtları
                    </h5>
                    {missingPages.length === 0 ? (
                      <p className="mt-2 text-xs text-[var(--text-muted)]">
                        Eksik sayfa kaydı yok.
                      </p>
                    ) : (
                      <div className="mt-2 space-y-2">
                        {missingPages.map((item) => (
                          <label
                            key={pageKey(item)}
                            className="flex items-start gap-2 rounded-lg border border-[var(--danger-border)] px-3 py-2 text-xs text-[var(--text-muted)]"
                          >
                            <input
                              type="checkbox"
                              checked={selectedMissingPages.has(pageKey(item))}
                              onChange={() => handleToggleMissingPage(pageKey(item))}
                            />
                            <span>
                              Cilt {item.bookId} · Sayfa {item.pageNumber} ·{' '}
                              {formatSideLabel(item.side)}
                              <span className="block truncate text-[11px]">{item.path}</span>
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4 text-sm text-[var(--text-muted)]">
            Tarama başlatıldığında sonuçlar burada görünecek.
          </div>
        )}
      </div>

      {/* Kimlik Bilgileri */}
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
              name="currentPassword"
              value={credentials.currentPassword}
              onChange={handleCredentialFieldChange}
              className="mt-2 w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm text-[var(--text-primary)]"
              required
            />
          </label>
          <label className="text-xs text-[var(--text-muted)]">
            Yeni Kullanıcı Adı
            <input
              name="newUsername"
              value={credentials.newUsername}
              onChange={handleCredentialFieldChange}
              className="mt-2 w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm text-[var(--text-primary)]"
              required
            />
          </label>
          <label className="text-xs text-[var(--text-muted)]">
            Yeni Şifre
            <input
              type="password"
              name="newPassword"
              value={credentials.newPassword}
              onChange={handleCredentialFieldChange}
              className="mt-2 w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm text-[var(--text-primary)]"
              required
            />
          </label>
          <label className="text-xs text-[var(--text-muted)]">
            Yeni Şifre Tekrar
            <input
              type="password"
              name="confirmPassword"
              value={credentials.confirmPassword}
              onChange={handleCredentialFieldChange}
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

      {/* Yedekleme */}
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

      {/* Hakkında */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
        <h3 className="text-lg">Hakkında</h3>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Cilt Dijital Kayıt Sistemi, cilt fotoğraflarını hızlı ve güvenli
          şekilde yönetmek için tasarlanmıştır.
        </p>
        <AlertMessage variant="danger" title="Önemli Bilgilendirme" className="mt-4">
          Bu program tamamen çevrimdışı çalışıp verileri cihazda depolar. Tek
          görevi depolanan resimleri kolay erişilebilir bir şekilde kullanıcıya
          sunmaktır. Kullanıcının bilgisi dışında herhangi bir hizmet, servis
          vb çalıştırmaz. Programın tüm kodları GitHub'da açık kaynak olarak
          yayınlanmıştır.
        </AlertMessage>
      </div>

      {viewerImagePath ? (
        <ImageViewer
          title="Görsel Önizleme"
          imagePath={viewerImagePath}
          onClose={closeViewer}
          panelClassName="max-w-[85vw] w-full"
        />
      ) : null}

      {confirmDeleteExtras ? (
        <ConfirmDialog
          title="Dosyaları Sil"
          message={`${confirmDeleteExtras.paths.length} dosya silinecek. Devam etmek istiyor musun?`}
          onCancel={cancelDeleteExtras}
          onConfirm={async () => {
            const paths = confirmDeleteExtras.paths
            setConfirmDeleteExtras(null)
            await handleDeleteExtras(paths)
          }}
        />
      ) : null}

      {confirmClearMissing ? (
        <ConfirmDialog
          title="Eksik Kayıtları Temizle"
          message="Seçili kayıtlar veritabanından temizlenecek. Devam etmek istiyor musun?"
          onCancel={cancelClearMissing}
          onConfirm={async () => {
            const payload = confirmClearMissing
            setConfirmClearMissing(null)
            await handleClearMissingRefs(payload)
          }}
        />
      ) : null}
    </section>
  )
}
