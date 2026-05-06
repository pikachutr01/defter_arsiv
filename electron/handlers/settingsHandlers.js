import fs from 'fs'
import path from 'path'
import { dialog } from 'electron'
import crypto from 'crypto'
import { ensureStorageFolders, getDefaultStoragePath } from '../db.js'

const getSetting = (db, key) =>
  db.prepare('SELECT value FROM settings WHERE key = ?').get(key)?.value || null

const setSetting = (db, key, value) => {
  db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run(key, value)
}

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

const buildFallbackStoragePath = (app) =>
  getDefaultStoragePath({
    userDataRoot: path.join(app.getPath('userData'), 'cilt-dijital-kayit-sistemi'),
    documentsRoot: app.getPath('documents'),
  })

const normalizeRelPath = (value) => String(value || '').replace(/\\/g, '/').replace(/^\/+/, '')

const isImageFile = (fileName) => {
  const ext = path.extname(fileName).toLowerCase()
  return ['.jpg', '.jpeg', '.png', '.webp'].includes(ext)
}

const listImagesRecursively = (baseDir, storagePath) => {
  if (!baseDir || !fs.existsSync(baseDir)) {
    return []
  }

  const results = []
  const queue = [baseDir]

  while (queue.length > 0) {
    const current = queue.pop()
    const entries = fs.readdirSync(current, { withFileTypes: true })

    entries.forEach((entry) => {
      const absPath = path.join(current, entry.name)

      if (entry.isDirectory()) {
        queue.push(absPath)
        return
      }

      if (!entry.isFile() || !isImageFile(entry.name)) {
        return
      }

      const relPath = normalizeRelPath(path.relative(storagePath, absPath))
      results.push({ absPath, relPath })
    })
  }

  return results
}

const parseExtraMeta = (relPath) => {
  const normalized = normalizeRelPath(relPath)
  const coverMatch = /^covers\/book_(\d+)\.(jpg|jpeg|png|webp)$/i.exec(normalized)
  if (coverMatch) {
    return { type: 'cover', bookId: Number(coverMatch[1]) }
  }

  const pageMatch =
    /^books\/book_(\d+)\/page_(\d+)\.(jpg|jpeg|png|webp)$/i.exec(normalized)
  if (pageMatch) {
    return {
      type: 'page',
      bookId: Number(pageMatch[1]),
      pageNumber: Number(pageMatch[2]),
    }
  }

  return { type: 'other' }
}

const resolveStoragePathSafe = (storagePath, relPath) => {
  const normalizedRel = normalizeRelPath(relPath)
  const absPath = path.normalize(path.join(storagePath, normalizedRel))
  const normalizedStorage = path.normalize(storagePath + path.sep)
  if (!absPath.startsWith(normalizedStorage)) {
    return null
  }
  return absPath
}

export const registerSettingsHandlers = ({ ipcMain, db, app }) => {
  ipcMain.handle('settings:get', (_event, key) => {
    try {
      const value = getSetting(db, key)
      return { success: true, data: value }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('settings:set', (_event, key, value) => {
    try {
      setSetting(db, key, value)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('settings:getStoragePath', () => {
    try {
      const value = getSetting(db, 'storage_path') || buildFallbackStoragePath(app)
      return { success: true, data: value }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('settings:setStoragePath', (_event, storagePath) => {
    try {
      if (!storagePath) {
        return { success: false, error: 'Geçersiz yol.' }
      }

      ensureStorageFolders(storagePath)
      ensureStorageId(db, storagePath)
      setSetting(db, 'storage_path', storagePath)
      return { success: true, data: storagePath }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('settings:chooseStoragePath', async () => {
    try {
      const currentPath =
        getSetting(db, 'storage_path') || buildFallbackStoragePath(app)

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

  ipcMain.handle('settings:verifyStoragePath', () => {
    try {
      const storagePath = getSetting(db, 'storage_path')
      if (!storagePath) {
        return { success: true, valid: true }
      }

      if (fs.existsSync(storagePath)) {
        return { success: true, valid: true }
      }

      const storageId = getSetting(db, 'storage_id')
      if (!storageId) {
        return { success: true, valid: false }
      }

      const pathWithoutDrive = storagePath.substring(storagePath.indexOf(':') + 1)
      const drives = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
      
      for (const drive of drives) {
        const candidatePath = `${drive}:${pathWithoutDrive}`
        const idFilePath = path.join(candidatePath, '.defter_arsiv_id')
        
        if (fs.existsSync(idFilePath)) {
          const fileId = fs.readFileSync(idFilePath, 'utf8').trim()
          if (fileId === storageId) {
            setSetting(db, 'storage_path', candidatePath)
            return { success: true, valid: true, autoRecovered: true, newPath: candidatePath }
          }
        }
      }

      return { success: true, valid: false }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('settings:scanStorageIntegrity', (_event, payload) => {
    try {
      const previewLimit = Number(payload?.previewLimit) || 0
      const storagePath = getSetting(db, 'storage_path') || buildFallbackStoragePath(app)
      if (!storagePath) {
        return { success: false, error: 'Depolama yolu tanımlı değil.' }
      }

      const coverImages = listImagesRecursively(path.join(storagePath, 'covers'), storagePath)
      const bookImages = listImagesRecursively(path.join(storagePath, 'books'), storagePath)
      const fileImages = [...coverImages, ...bookImages]

      const dbCoverRows = db
        .prepare("SELECT id, name, cover_image FROM books WHERE cover_image IS NOT NULL AND cover_image != ''")
        .all()
      const dbPageRows = db
        .prepare('SELECT id, book_id, page_number, image FROM pages')
        .all()

      const dbRefs = []

      dbCoverRows.forEach((row) => {
        const relPath = normalizeRelPath(row.cover_image)
        if (!relPath) return
        dbRefs.push({
          type: 'cover',
          bookId: row.id,
          bookName: row.name || '',
          path: relPath,
        })
      })

      dbPageRows.forEach((row) => {
        const imagePath = normalizeRelPath(row.image)
        if (imagePath) {
          dbRefs.push({
            type: 'page',
            pageId: row.id,
            bookId: row.book_id,
            pageNumber: row.page_number,
            path: imagePath,
          })
        }
      })

      const dbPathSet = new Set(dbRefs.map((item) => normalizeRelPath(item.path)))
      const fsPathSet = new Set(fileImages.map((item) => normalizeRelPath(item.relPath)))

      const fileExtrasAll = fileImages
        .filter((item) => !dbPathSet.has(normalizeRelPath(item.relPath)))
        .map((item) => ({
          path: normalizeRelPath(item.relPath),
          ...parseExtraMeta(item.relPath),
        }))

      const fileExtras = previewLimit > 0 ? fileExtrasAll.slice(0, previewLimit) : fileExtrasAll
      const fileExtrasTotal = fileExtrasAll.length
      const fileExtrasTruncated = fileExtrasAll.length > fileExtras.length

      const dbMissingAll = dbRefs.filter((item) => !fsPathSet.has(normalizeRelPath(item.path)))
      const dbMissing = {
        covers: dbMissingAll
          .filter((item) => item.type === 'cover')
          .map((item) => ({
            bookId: item.bookId,
            bookName: item.bookName,
            path: item.path,
          })),
        pages: dbMissingAll
          .filter((item) => item.type === 'page')
          .map((item) => ({
            pageId: item.pageId,
            bookId: item.bookId,
            pageNumber: item.pageNumber,
            path: item.path,
          })),
      }

      return {
        success: true,
        data: {
          storagePath,
          fileExtras,
          fileExtrasTotal,
          fileExtrasTruncated,
          dbMissing,
        },
      }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('settings:deleteOrphanFiles', (_event, payload) => {
    try {
      const storagePath = getSetting(db, 'storage_path') || buildFallbackStoragePath(app)
      if (!storagePath) {
        return { success: false, error: 'Depolama yolu tanımlı değil.' }
      }

      const paths = Array.isArray(payload?.paths) ? payload.paths : []
      let removed = 0

      paths.forEach((relPath) => {
        const absPath = resolveStoragePathSafe(storagePath, relPath)
        if (!absPath || !fs.existsSync(absPath)) return
        const stat = fs.statSync(absPath)
        if (!stat.isFile()) return
        fs.unlinkSync(absPath)
        removed += 1
      })

      return { success: true, data: { removed } }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('settings:clearMissingRefs', (_event, payload) => {
    try {
      const covers = Array.isArray(payload?.covers) ? payload.covers : []
      const pages = Array.isArray(payload?.pages) ? payload.pages : []

      covers.forEach((bookId) => {
        db.prepare(
          'UPDATE books SET cover_image = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
        ).run(bookId)
      })

      pages.forEach((item) => {
        const pageId = item?.pageId
        if (!pageId) return
        db.prepare(
          'UPDATE pages SET image = NULL, is_uploaded = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
        ).run(pageId)
      })

      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })
}
