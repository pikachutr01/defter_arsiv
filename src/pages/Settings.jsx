import { useEffect, useMemo, useState } from 'react'
import useSettingsStore from '../store/useSettingsStore.js'
import { ipc } from '../utils/ipc.js'
import AlertMessage from '../components/shared/AlertMessage.jsx'
import ImageViewer from '../components/images/ImageViewer.jsx'
import ConfirmDialog from '../components/shared/ConfirmDialog.jsx'
import { toLocalAssetUrl } from '../utils/paths.js'

const PREVIEW_LIMIT = 500
const formatSideLabel = (side) =>
  side === 'A' ? 'Sol Taraf' : side === 'B' ? 'Sağ Taraf' : side

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

  const fileExtras = scanResult?.fileExtras || []
  const missingCovers = scanResult?.dbMissing?.covers || []
  const missingPages = scanResult?.dbMissing?.pages || []

  const pageKey = (item) => `${item.pageId}:${item.side}`

  const selectedMissingPagesList = useMemo(
    () =>
      missingPages
        .filter((item) => selectedMissingPages.has(pageKey(item)))
        .map((item) => ({ pageId: item.pageId, side: item.side })),
    [missingPages, selectedMissingPages]
  )

  const resetSelections = () => {
    setSelectedExtra(new Set())
    setSelectedMissingCovers(new Set())
    setSelectedMissingPages(new Set())
  }

  const runIntegrityScan = async () => {
    setIsScanning(true)
    setScanError(null)
    setScanStatus(null)
    const result = await ipc.settingsScanStorageIntegrity({ previewLimit: PREVIEW_LIMIT })
    setIsScanning(false)

    if (result.success) {
      setScanResult(result.data)
      setScanStatus({
        type: 'success',
        message: 'Tarama tamamlandı.',
      })
      resetSelections()
      return
    }

    setScanError(result.error || 'Tarama başarısız.')
  }

  const handleDeleteExtras = async (paths) => {
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
  }

  const handleClearMissingRefs = async (payload) => {
    const hasCovers = payload.covers?.length
    const hasPages = payload.pages?.length
    if (!hasCovers && !hasPages) return

    const result = await ipc.settingsClearMissingRefs(payload)
    if (result.success) {
      setScanStatus({
        type: 'success',
        message: 'Eksik kayıtlar temizlendi.',
      })
      await runIntegrityScan()
      return
    }
    setScanError(result.error || 'Kayıtlar temizlenemedi.')
  }

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

  const allExtrasSelected =
    fileExtras.length > 0 && selectedExtra.size === fileExtras.length
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
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3 text-sm text-[var(--text-muted)]">
              {scanResult.fileExtrasTotal} klasör kaydı veritabanında yok,{' '}
              {missingCovers.length + missingPages.length} veritabanı kaydı klasörde yok.
              {scanResult.fileExtrasTruncated ? (
                <span className="ml-2 text-[var(--text-primary)]">
                  Önizleme ilk {PREVIEW_LIMIT} kayıtla sınırlandı.
                </span>
              ) : null}
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-semibold text-[var(--text-primary)]">
                    Klasörde var, veritabanında yok
                  </h4>
                  <p className="text-xs text-[var(--text-muted)]">
                    Fazla dosyaları istersen sil.
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
                  {fileExtras.map((item) => (
                    <article
                      key={item.path}
                      className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <label className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                          <input
                            type="checkbox"
                            checked={selectedExtra.has(item.path)}
                            onChange={() =>
                              setSelectedExtra((prev) => {
                                const next = new Set(prev)
                                if (next.has(item.path)) {
                                  next.delete(item.path)
                                } else {
                                  next.add(item.path)
                                }
                                return next
                              })
                            }
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
                        {toLocalAssetUrl(storagePath, item.path) ? (
                          <img
                            src={toLocalAssetUrl(storagePath, item.path)}
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
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3">
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
                      selectedMissingCovers.size === 0 &&
                      selectedMissingPages.size === 0
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
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-3">
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
                            className="flex items-start gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-xs text-[var(--text-muted)]"
                          >
                            <input
                              type="checkbox"
                              checked={selectedMissingCovers.has(item.bookId)}
                              onChange={() =>
                                setSelectedMissingCovers((prev) => {
                                  const next = new Set(prev)
                                  if (next.has(item.bookId)) {
                                    next.delete(item.bookId)
                                  } else {
                                    next.add(item.bookId)
                                  }
                                  return next
                                })
                              }
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

                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-3">
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
                            className="flex items-start gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-xs text-[var(--text-muted)]"
                          >
                            <input
                              type="checkbox"
                              checked={selectedMissingPages.has(pageKey(item))}
                              onChange={() =>
                                setSelectedMissingPages((prev) => {
                                  const next = new Set(prev)
                                  if (next.has(pageKey(item))) {
                                    next.delete(pageKey(item))
                                  } else {
                                    next.add(pageKey(item))
                                  }
                                  return next
                                })
                              }
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

      {viewerImagePath ? (
        <ImageViewer
          title="Görsel Önizleme"
          imagePath={viewerImagePath}
          onClose={() => setViewerImagePath(null)}
          panelClassName="max-w-[85vw] w-full"
        />
      ) : null}

      {confirmDeleteExtras ? (
        <ConfirmDialog
          title="Dosyaları Sil"
          message={`${confirmDeleteExtras.paths.length} dosya silinecek. Devam etmek istiyor musun?`}
          onCancel={() => setConfirmDeleteExtras(null)}
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
          onCancel={() => setConfirmClearMissing(null)}
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
