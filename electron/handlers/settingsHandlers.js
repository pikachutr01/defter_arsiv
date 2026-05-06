import fs from 'fs'
import path from 'path'
import { dialog } from 'electron'
import crypto from 'crypto'
import { ensureStorageFolders, getDefaultStoragePath } from '../db.js'

// ─── DB Yardımcıları ─────────────────────────────────────────────────────────

const getSetting = (db, key) =>
  db.prepare('SELECT value FROM settings WHERE key = ?').get(key)?.value ?? null

const setSetting = (db, key, value) =>
  db
    .prepare(
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
    )
    .run(key, value)

// ─── Depolama ID Yönetimi ────────────────────────────────────────────────────

const ensureStorageId = (db, storagePath) => {
  let storageId = getSetting(db, 'storage_id')
  if (!storageId) {
    storageId = crypto.randomUUID()
    setSetting(db, 'storage_id', storageId)
  }

  const idFilePath = path.join(storagePath, '.defter_arsiv_id')

  if (!fs.existsSync(idFilePath)) {
    fs.writeFileSync(idFilePath, storageId, 'utf8')
  } else {
    const existingId = fs.readFileSync(idFilePath, 'utf8').trim()
    if (existingId !== storageId) {
      setSetting(db, 'storage_id', existingId)
    }
  }
}

// ─── Yardımcılar ─────────────────────────────────────────────────────────────

const buildFallbackStoragePath = (app) =>
  getDefaultStoragePath({
    userDataRoot: path.join(app.getPath('userData'), 'cilt-dijital-kayit-sistemi'),
    documentsRoot: app.getPath('documents'),
  })

const normalizeRelPath = (value) =>
  String(value ?? '').replace(/\\/g, '/').replace(/^\/+/, '')

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp'])
const isImageFile = (fileName) =>
  IMAGE_EXTENSIONS.has(path.extname(fileName).toLowerCase())

// Yinelemeli görsel tarama — iteratif BFS ile stack overflow riski yok
const listImagesRecursively = (baseDir, storagePath) => {
  if (!baseDir || !fs.existsSync(baseDir)) return []

  const results = []
  const queue = [baseDir]

  while (queue.length > 0) {
    const current = queue.pop()
    const entries = fs.readdirSync(current, { withFileTypes: true })

    for (const entry of entries) {
      const absPath = path.join(current, entry.name)
      if (entry.isDirectory()) {
        queue.push(absPath)
      } else if (entry.isFile() && isImageFile(entry.name)) {
        results.push({ absPath, relPath: normalizeRelPath(path.relative(storagePath, absPath)) })
      }
    }
  }

  return results
}

// Dosya yolundan tür ve meta bilgisi çıkar (memoize edilebilir ama set başına bir kez çağrılıyor)
const COVER_RE = /^covers\/book_(\d+)\.(jpg|jpeg|png|webp)$/i
const PAGE_RE = /^books\/book_(\d+)\/page_(\d+)\.(jpg|jpeg|png|webp)$/i

const parseExtraMeta = (relPath) => {
  const normalized = normalizeRelPath(relPath)
  const coverMatch = COVER_RE.exec(normalized)
  if (coverMatch) return { type: 'cover', bookId: Number(coverMatch[1]) }

  const pageMatch = PAGE_RE.exec(normalized)
  if (pageMatch) return { type: 'page', bookId: Number(pageMatch[1]), pageNumber: Number(pageMatch[2]) }

  return { type: 'other' }
}

// Path traversal saldırılarına karşı güvenli mutlak yol çözümleyici
const resolveStoragePathSafe = (storagePath, relPath) => {
  const absPath = path.normalize(path.join(storagePath, normalizeRelPath(relPath)))
  const normalizedStorage = path.normalize(storagePath + path.sep)
  return absPath.startsWith(normalizedStorage) ? absPath : null
}

// Windows sürücü tarama — memoize edilmiş sabit liste
const DRIVE_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

// ─── IPC Handler Kayıt Fonksiyonu ────────────────────────────────────────────

export const registerSettingsHandlers = ({ ipcMain, db, app }) => {

  // ── Ayar Oku ───────────────────────────────────────────────────────────────
  ipcMain.handle('settings:get', (_event, key) => {
    try {
      return { success: true, data: getSetting(db, key) }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  // ── Ayar Yaz ───────────────────────────────────────────────────────────────
  ipcMain.handle('settings:set', (_event, key, value) => {
    try {
      setSetting(db, key, value)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  // ── Depolama Yolunu Al ─────────────────────────────────────────────────────
  ipcMain.handle('settings:getStoragePath', () => {
    try {
      const value = getSetting(db, 'storage_path') ?? buildFallbackStoragePath(app)
      return { success: true, data: value }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  // ── Depolama Yolunu Kaydet ─────────────────────────────────────────────────
  ipcMain.handle('settings:setStoragePath', (_event, storagePath) => {
    try {
      if (!storagePath) return { success: false, error: 'Geçersiz yol.' }

      ensureStorageFolders(storagePath)
      ensureStorageId(db, storagePath)
      setSetting(db, 'storage_path', storagePath)
      return { success: true, data: storagePath }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  // ── Klasör Seç (Dialog) ────────────────────────────────────────────────────
  ipcMain.handle('settings:chooseStoragePath', async () => {
    try {
      const currentPath = getSetting(db, 'storage_path') ?? buildFallbackStoragePath(app)

      const result = await dialog.showOpenDialog({
        title: 'Depolama klasörünü seçin',
        defaultPath: currentPath,
        properties: ['openDirectory', 'createDirectory'],
      })

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, canceled: true }
      }

      const selectedPath = result.filePaths[0]
      ensureStorageFolders(selectedPath)
      ensureStorageId(db, selectedPath)
      setSetting(db, 'storage_path', selectedPath)
      return { success: true, data: selectedPath }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  // ── Depolama Yolunu Doğrula & Otomatik Kurtar ─────────────────────────────
  ipcMain.handle('settings:verifyStoragePath', () => {
    try {
      const storagePath = getSetting(db, 'storage_path')
      if (!storagePath) return { success: true, valid: true }
      if (fs.existsSync(storagePath)) return { success: true, valid: true }

      const storageId = getSetting(db, 'storage_id')
      if (!storageId) return { success: true, valid: false }

      // Windows sürücü harfi değişikliğini otomatik kurtar
      const pathWithoutDrive = storagePath.substring(storagePath.indexOf(':') + 1)

      for (const drive of DRIVE_LETTERS) {
        const candidatePath = `${drive}:${pathWithoutDrive}`
        const idFilePath = path.join(candidatePath, '.defter_arsiv_id')

        if (!fs.existsSync(idFilePath)) continue

        const fileId = fs.readFileSync(idFilePath, 'utf8').trim()
        if (fileId !== storageId) continue

        setSetting(db, 'storage_path', candidatePath)
        return { success: true, valid: true, autoRecovered: true, newPath: candidatePath }
      }

      return { success: true, valid: false }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  // ── Depolama Bütünlüğünü Tara ──────────────────────────────────────────────
  ipcMain.handle('settings:scanStorageIntegrity', (_event, payload) => {
    try {
      const previewLimit = Number(payload?.previewLimit) || 0
      const storagePath = getSetting(db, 'storage_path') ?? buildFallbackStoragePath(app)
      if (!storagePath) return { success: false, error: 'Depolama yolu tanımlı değil.' }

      // Disk üzerindeki görsel dosyaları tara
      const fileImages = [
        ...listImagesRecursively(path.join(storagePath, 'covers'), storagePath),
        ...listImagesRecursively(path.join(storagePath, 'books'), storagePath),
      ]

      // DB referanslarını topla
      const dbCoverRows = db
        .prepare("SELECT id, name, cover_image FROM books WHERE cover_image IS NOT NULL AND cover_image != ''")
        .all()
      const dbPageRows = db.prepare('SELECT id, book_id, page_number, image FROM pages').all()

      const dbRefs = [
        ...dbCoverRows
          .filter((row) => normalizeRelPath(row.cover_image))
          .map((row) => ({
            type: 'cover',
            bookId: row.id,
            bookName: row.name ?? '',
            path: normalizeRelPath(row.cover_image),
          })),
        ...dbPageRows
          .filter((row) => normalizeRelPath(row.image))
          .map((row) => ({
            type: 'page',
            pageId: row.id,
            bookId: row.book_id,
            pageNumber: row.page_number,
            path: normalizeRelPath(row.image),
          })),
      ]

      const dbPathSet = new Set(dbRefs.map((r) => r.path))
      const fsPathSet = new Set(fileImages.map((f) => f.relPath))

      // Disk'te var ama DB'de kayıtsız dosyalar
      const fileExtrasAll = fileImages
        .filter((f) => !dbPathSet.has(f.relPath))
        .map((f) => ({ path: f.relPath, ...parseExtraMeta(f.relPath) }))

      const fileExtras = previewLimit > 0 ? fileExtrasAll.slice(0, previewLimit) : fileExtrasAll

      // DB'de kayıtlı ama disk'te olmayan referanslar
      const dbMissingAll = dbRefs.filter((r) => !fsPathSet.has(r.path))

      return {
        success: true,
        data: {
          storagePath,
          fileExtras,
          fileExtrasTotal: fileExtrasAll.length,
          fileExtrasTruncated: fileExtrasAll.length > fileExtras.length,
          dbMissing: {
            covers: dbMissingAll
              .filter((r) => r.type === 'cover')
              .map(({ bookId, bookName, path: p }) => ({ bookId, bookName, path: p })),
            pages: dbMissingAll
              .filter((r) => r.type === 'page')
              .map(({ pageId, bookId, pageNumber, path: p }) => ({ pageId, bookId, pageNumber, path: p })),
          },
        },
      }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  // ── Sahipsiz Dosyaları Sil ─────────────────────────────────────────────────
  ipcMain.handle('settings:deleteOrphanFiles', (_event, payload) => {
    try {
      const storagePath = getSetting(db, 'storage_path') ?? buildFallbackStoragePath(app)
      if (!storagePath) return { success: false, error: 'Depolama yolu tanımlı değil.' }

      const paths = Array.isArray(payload?.paths) ? payload.paths : []
      let removed = 0

      for (const relPath of paths) {
        const absPath = resolveStoragePathSafe(storagePath, relPath)
        if (!absPath || !fs.existsSync(absPath)) continue
        if (!fs.statSync(absPath).isFile()) continue
        fs.unlinkSync(absPath)
        removed += 1
      }

      return { success: true, data: { removed } }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  // ── Eksik DB Referanslarını Temizle ───────────────────────────────────────
  ipcMain.handle('settings:clearMissingRefs', (_event, payload) => {
    try {
      const covers = Array.isArray(payload?.covers) ? payload.covers : []
      const pages = Array.isArray(payload?.pages) ? payload.pages : []

      const clearCover = db.prepare(
        'UPDATE books SET cover_image = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
      )
      const clearPage = db.prepare(
        'UPDATE pages SET image = NULL, is_uploaded = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
      )

      // Prepared statement'ları transaction içinde toplu çalıştır
      db.transaction(() => {
        for (const bookId of covers) clearCover.run(bookId)
        for (const item of pages) {
          if (item?.pageId) clearPage.run(item.pageId)
        }
      })()

      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })
}