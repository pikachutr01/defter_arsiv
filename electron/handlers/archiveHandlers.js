import fs from 'fs'
import path from 'path'
import { app, dialog } from 'electron'
import archiver from 'archiver'
import unzipper from 'unzipper'
import { pipeline } from 'stream/promises'

// ─── Helpers ────────────────────────────────────────────────────────────────

const ensureDir = (targetPath) => fs.mkdirSync(targetPath, { recursive: true })

const getAppDataPath = () =>
  path.join(app.getPath('userData'), 'cilt-dijital-kayit-sistemi')

/**
 * Cache'li storage path getter.
 * Her IPC çağrısında tekrar sorgu atmak yerine ilk okumada önbelleğe alır.
 */
let _cachedStoragePath = undefined
const getStoragePath = (db) => {
  if (_cachedStoragePath !== undefined) return _cachedStoragePath
  _cachedStoragePath =
    db.prepare('SELECT value FROM settings WHERE key = ?').get('storage_path')
      ?.value ?? null
  return _cachedStoragePath
}

/**
 * Tek dosyayı async olarak kopyalar (fs.promises kullanır).
 * Büyük dosyalarda event loop'u bloklamaz.
 */
const copyFileAsync = async (src, dest) => {
  ensureDir(path.dirname(dest))
  await fs.promises.copyFile(src, dest)
}

/**
 * Dizini veya dosyayı async-recursive kopyalar.
 * Orijinal senkron implementasyonun async karşılığı.
 */
const copyRecursiveAsync = async (src, dest) => {
  if (!fs.existsSync(src)) return
  const stat = await fs.promises.stat(src)
  if (stat.isDirectory()) {
    ensureDir(dest)
    const entries = await fs.promises.readdir(src)
    await Promise.all(
      entries.map((entry) =>
        copyRecursiveAsync(path.join(src, entry), path.join(dest, entry))
      )
    )
  } else {
    await copyFileAsync(src, dest)
  }
}

const removeIfExists = (targetPath) => {
  if (fs.existsSync(targetPath)) {
    fs.rmSync(targetPath, { recursive: true, force: true })
  }
}

/**
 * ZIP stream'ini Promise'e sarar; hem 'close' hem 'error' olaylarını yakalar.
 */
const finalizeArchive = (archive, output) =>
  new Promise((resolve, reject) => {
    output.on('close', resolve)
    output.on('error', reject)
    archive.on('error', reject)
    archive.finalize()
  })

/**
 * unzipper stream'ini pipeline ile çalıştırır; hata durumunda Promise reddedilir.
 */
const extractZip = (zipPath, destDir) =>
  pipeline(
    fs.createReadStream(zipPath),
    unzipper.Extract({ path: destDir })
  )

// ─── IPC Handlers ───────────────────────────────────────────────────────────

export const registerArchiveHandlers = ({ ipcMain, db }) => {

  /**
   * archive:exportFull
   * Veritabanı + görselleri tek ZIP dosyasına aktarır.
   */
  ipcMain.handle('archive:exportFull', async () => {
    try {
      const saveResult = await dialog.showSaveDialog({
        title: 'Tam Arşiv Dışarı Aktar',
        defaultPath: `cilt-dijital-kayit-sistemi-backup-${new Date().toISOString().slice(0, 10)}.zip`,
        filters: [{ name: 'ZIP', extensions: ['zip'] }],
      })

      if (saveResult.canceled || !saveResult.filePath) {
        return { success: false, error: 'Kayıt iptal edildi.' }
      }

      const storagePath = getStoragePath(db)
      if (!storagePath) {
        return { success: false, error: 'Depolama yolu tanımlı değil.' }
      }

      const dataPath = getAppDataPath()
      const dbPath = path.join(dataPath, 'database.sqlite')

      // Üç sorguyu paralel çalıştır
      const [{ count: bookCount }, { count: pageCount }, { count: imageCount }] =
        await Promise.all([
          Promise.resolve(db.prepare('SELECT COUNT(*) AS count FROM books').get()),
          Promise.resolve(db.prepare('SELECT COUNT(*) AS count FROM pages').get()),
          Promise.resolve(
            db.prepare('SELECT COUNT(*) AS count FROM pages WHERE is_uploaded = 1').get()
          ),
        ])

      const manifest = {
        version: '1.0',
        exported_at: new Date().toISOString(),
        book_count: bookCount,
        page_count: pageCount,
        image_count: imageCount,
      }

      const output = fs.createWriteStream(saveResult.filePath)
      const archive = archiver('zip', { zlib: { level: 9 } })

      archive.pipe(output)
      archive.append(JSON.stringify(manifest, null, 2), { name: 'manifest.json' })

      if (fs.existsSync(dbPath)) {
        archive.file(dbPath, { name: 'database.sqlite' })
      }
      if (fs.existsSync(storagePath)) {
        archive.directory(storagePath, 'images')
      }

      await finalizeArchive(archive, output)
      return { success: true, data: { filePath: saveResult.filePath } }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  /**
   * archive:importFull
   * ZIP arşivinden veritabanı + görselleri geri yükler.
   * Hata durumunda otomatik rollback yapar.
   */
  ipcMain.handle('archive:importFull', async () => {
    const dataPath = getAppDataPath()
    const currentDbPath = path.join(dataPath, 'database.sqlite')
    const backupPath = path.join(dataPath, `backup-${Date.now()}`)
    let tempDir = null

    // Rollback için durum bayrakları
    let backupReady = false
    let replacedDb = false
    let replacedImages = false
    let storagePath = null

    try {
      const openResult = await dialog.showOpenDialog({
        title: 'Arşiv İçe Aktar',
        properties: ['openFile'],
        filters: [{ name: 'ZIP', extensions: ['zip'] }],
      })

      if (openResult.canceled || openResult.filePaths.length === 0) {
        return { success: false, error: 'Seçim iptal edildi.' }
      }

      storagePath = getStoragePath(db)
      if (!storagePath) {
        return { success: false, error: 'Depolama yolu tanımlı değil.' }
      }

      const zipPath = openResult.filePaths[0]

      // ── 1. Backup al ─────────────────────────────────────────────────────
      ensureDir(backupPath)

      /**
       * SQLite WAL modundaysa dosyayı kopyalamadan önce checkpoint zorluyoruz.
       * Bu sayede kopyalanan .sqlite tutarlı bir snapshot olur.
       */
      try {
        db.pragma('wal_checkpoint(TRUNCATE)')
      } catch {
        // WAL aktif değilse görmezden gel
      }

      await Promise.all([
        fs.existsSync(currentDbPath)
          ? copyRecursiveAsync(currentDbPath, path.join(backupPath, 'database.sqlite'))
          : Promise.resolve(),
        fs.existsSync(storagePath)
          ? copyRecursiveAsync(storagePath, path.join(backupPath, 'images'))
          : Promise.resolve(),
      ])
      backupReady = true

      // ── 2. ZIP'i çıkart ──────────────────────────────────────────────────
      tempDir = fs.mkdtempSync(path.join(dataPath, 'import-'))
      await extractZip(zipPath, tempDir)

      const importedDb = path.join(tempDir, 'database.sqlite')
      const importedImages = path.join(tempDir, 'images')

      if (!fs.existsSync(importedDb)) {
        return { success: false, error: 'Arşivde veritabanı bulunamadı.' }
      }

      // ── 3. Uygula ────────────────────────────────────────────────────────
      await copyRecursiveAsync(importedDb, currentDbPath)
      replacedDb = true

      if (fs.existsSync(importedImages)) {
        removeIfExists(storagePath)
        await copyRecursiveAsync(importedImages, storagePath)
        replacedImages = true
      }

      // ── 4. Temizle & yeniden başlat ──────────────────────────────────────
      removeIfExists(tempDir)
      removeIfExists(backupPath)

      // relaunch'ı güvenli biçimde tetikle; microtask queue bitmesini bekle
      setImmediate(() => {
        app.relaunch()
        app.exit(0)
      })

      return { success: true }
    } catch (error) {
      // ── Rollback ─────────────────────────────────────────────────────────
      if (backupReady) {
        const backupDbPath = path.join(backupPath, 'database.sqlite')
        const backupImagesPath = path.join(backupPath, 'images')

        try {
          if (replacedDb && fs.existsSync(backupDbPath)) {
            await copyRecursiveAsync(backupDbPath, currentDbPath)
          }
          if (replacedImages && fs.existsSync(backupImagesPath) && storagePath) {
            removeIfExists(storagePath)
            await copyRecursiveAsync(backupImagesPath, storagePath)
          }
        } catch (rollbackError) {
          // Rollback da başarısız olduysa her iki hatayı birleştirip döndür
          return {
            success: false,
            error: `${error.message} | Rollback hatası: ${rollbackError.message}`,
          }
        }
      }

      // Hata durumunda tempDir'i temizlemeyi unutma
      if (tempDir) removeIfExists(tempDir)

      return { success: false, error: error.message }
    }
  })
}