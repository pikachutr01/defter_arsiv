import fs from 'fs'
import path from 'path'
import sharp from 'sharp'
import { dialog, shell } from 'electron'

// ─── Helpers ─────────────────────────────────────────────────────────────────

let _cachedStoragePath = undefined
const getStoragePath = (db) => {
  if (_cachedStoragePath !== undefined) return _cachedStoragePath
  _cachedStoragePath =
    db.prepare('SELECT value FROM settings WHERE key = ?').get('storage_path')
      ?.value ?? null
  return _cachedStoragePath
}

const ensureDir = (targetPath) => fs.mkdirSync(targetPath, { recursive: true })

const buildImagePaths = (storagePath, bookId, pageNumber) => {
  const baseFolder = path.join(storagePath, 'books', `book_${bookId}`)
  const fileBase = `page_${pageNumber}`
  return {
    baseFolder,
    originalAbs: path.join(baseFolder, `${fileBase}.jpg`),
    originalRel: path.posix.join('books', `book_${bookId}`, `${fileBase}.jpg`),
    legacyThumbAbs: path.join(baseFolder, `${fileBase}_thumb.jpg`),
  }
}

const updatePageImage = (db, pageId, relativePath, uploaded) => {
  db.prepare(
    'UPDATE pages SET image = ?, is_uploaded = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).run(relativePath, uploaded ? 1 : 0, pageId)
}

const getPageInfo = (db, pageId) =>
  db
    .prepare(
      `SELECT pages.id, pages.page_number, pages.book_id, books.name AS book_name
       FROM pages JOIN books ON pages.book_id = books.id
       WHERE pages.id = ?`
    )
    .get(pageId)

const resolveStoragePath = (storagePath, targetPath) =>
  path.isAbsolute(targetPath) ? targetPath : path.join(storagePath, targetPath)

const removeIfExists = (targetPath) => {
  if (targetPath && fs.existsSync(targetPath)) fs.unlinkSync(targetPath)
}

const getImageQuality = (db) => {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'image_quality'").get()
  return row ? parseInt(row.value, 10) : 80
}

const optimizeAndSaveImage = async (db, sourcePath, targetPath) => {
  const quality = getImageQuality(db)
  const instance = sharp(sourcePath, { failOn: 'none' }).rotate()
  const metadata = await instance.metadata()

  const pipeline = metadata.hasAlpha
    ? instance.flatten({ background: '#ffffff' })
    : instance

  await pipeline
    .jpeg({
      quality,
      mozjpeg: true,
      progressive: true,
      chromaSubsampling: '4:4:4',
    })
    .toFile(targetPath)
}

// ─── IPC Handlers ────────────────────────────────────────────────────────────

export const registerImageHandlers = ({ ipcMain, db }) => {
  // Sık kullanılan sorguları bir kez derle
  const stmtGetPageBasic = db.prepare(
    'SELECT book_id, page_number FROM pages WHERE id = ?'
  )

  const handleUpload = async (pageId, sourcePath) => {
    try {
      const storagePath = getStoragePath(db)
      if (!storagePath) {
        return { success: false, error: 'Depolama yolu tanımlı değil.' }
      }

      const page = getPageInfo(db, pageId)
      if (!page) {
        return { success: false, error: 'Sayfa bulunamadı.' }
      }

      const imagePaths = buildImagePaths(storagePath, page.book_id, page.page_number)

      ensureDir(imagePaths.baseFolder)
      await optimizeAndSaveImage(db, sourcePath, imagePaths.originalAbs)
      removeIfExists(imagePaths.legacyThumbAbs)

      updatePageImage(db, pageId, imagePaths.originalRel, true)
      return { success: true, data: { imagePath: imagePaths.originalRel } }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  ipcMain.handle('images:upload', (_event, pageId, sourcePath) =>
    handleUpload(pageId, sourcePath)
  )

  ipcMain.handle('images:uploadFromDialog', async (_event, pageId) => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp'] }],
      })

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, error: 'Seçim iptal edildi.' }
      }

      return handleUpload(pageId, result.filePaths[0])
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('images:delete', (_event, pageId) => {
    try {
      const storagePath = getStoragePath(db)
      if (!storagePath) {
        return { success: false, error: 'Depolama yolu tanımlı değil.' }
      }

      const page = stmtGetPageBasic.get(pageId)
      if (!page) {
        return { success: false, error: 'Sayfa bulunamadı.' }
      }

      const imagePaths = buildImagePaths(storagePath, page.book_id, page.page_number)
      removeIfExists(imagePaths.originalAbs)
      removeIfExists(imagePaths.legacyThumbAbs)

      updatePageImage(db, pageId, null, false)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('images:rotate', async (_event, pageId) => {
    try {
      const storagePath = getStoragePath(db)
      if (!storagePath) {
        return { success: false, error: 'Depolama yolu tanımlı değil.' }
      }

      const page = getPageInfo(db, pageId)
      if (!page) {
        return { success: false, error: 'Sayfa bulunamadı.' }
      }

      const imagePaths = buildImagePaths(storagePath, page.book_id, page.page_number)

      if (!fs.existsSync(imagePaths.originalAbs)) {
        return { success: false, error: 'Döndürülecek resim bulunamadı.' }
      }

      const tempPath = imagePaths.originalAbs + '.tmp.jpg'
      const quality = getImageQuality(db)

      const instance = sharp(imagePaths.originalAbs, { failOn: 'none' }).rotate(-90)
      const metadata = await instance.metadata()

      const pipeline = metadata.hasAlpha
        ? instance.flatten({ background: '#ffffff' })
        : instance

      await pipeline
        .jpeg({
          quality: quality,
          mozjpeg: true,
          progressive: true,
          chromaSubsampling: '4:4:4',
        })
        .toFile(tempPath)

      fs.unlinkSync(imagePaths.originalAbs)
      fs.renameSync(tempPath, imagePaths.originalAbs)

      updatePageImage(db, pageId, imagePaths.originalRel, true)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('images:export', async (_event, imagePaths, destFolder) => {
    try {
      const storagePath = getStoragePath(db)
      if (!storagePath) {
        return { success: false, error: 'Depolama yolu tanımlı değil.' }
      }

      ensureDir(destFolder)

      // Kopyalamaları paralel çalıştır
      await Promise.all(
        imagePaths.map(async (imagePath) => {
          const sourceAbs = resolveStoragePath(storagePath, imagePath)
          if (fs.existsSync(sourceAbs)) {
            await fs.promises.copyFile(
              sourceAbs,
              path.join(destFolder, path.basename(sourceAbs))
            )
          }
        })
      )

      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('images:revealInFolder', (_event, imagePath) => {
    try {
      const storagePath = getStoragePath(db)
      if (!storagePath) {
        return { success: false, error: 'Depolama yolu tanımlı değil.' }
      }

      const absPath = resolveStoragePath(storagePath, imagePath)
      if (!fs.existsSync(absPath)) {
        return { success: false, error: 'Resim bulunamadı.' }
      }

      shell.showItemInFolder(absPath)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('images:getThumbnail', (_event, imagePath) => {
    try {
      const storagePath = getStoragePath(db)
      if (!storagePath) {
        return { success: false, error: 'Depolama yolu tanımlı değil.' }
      }

      const absPath = resolveStoragePath(storagePath, imagePath)
      if (!fs.existsSync(absPath)) {
        return { success: false, error: 'Resim bulunamadı.' }
      }

      return { success: true, data: absPath }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })
}