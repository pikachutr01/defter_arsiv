import fs from 'fs'
import path from 'path'
import sharp from 'sharp'
import heicConvert from 'heic-convert'
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

const HEIC_EXTS = new Set(['.heic', '.heif'])

/**
 * HEIC/HEIF kaynak dosyasını JPEG Buffer'a dönüştürür.
 * Diğer formatlarda null döner (sharp doğrudan işler).
 */
const convertHeicToBuffer = async (sourcePath) => {
  const ext = path.extname(sourcePath).toLowerCase()
  if (!HEIC_EXTS.has(ext)) return null
  const inputBuffer = fs.readFileSync(sourcePath)
  const outputBuffer = await heicConvert({
    buffer: inputBuffer,
    format: 'JPEG',
    quality: 1, // heic-convert kalite 0–1 arası
  })
  return Buffer.from(outputBuffer)
}

const optimizeAndSaveImage = async (db, sourcePath, targetPath) => {
  const quality = getImageQuality(db)
  const heicBuffer = await convertHeicToBuffer(sourcePath)
  const sharpInput = heicBuffer ?? sourcePath
  const instance = sharp(sharpInput, { failOn: 'none' }).rotate()
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
        filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'] }],
      })

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, error: 'Seçim iptal edildi.' }
      }

      return handleUpload(pageId, result.filePaths[0])
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('images:selectFromDialog', async () => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'] }],
      })
      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, error: 'Seçim iptal edildi.' }
      }
      return { success: true, filePath: result.filePaths[0] }
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

  ipcMain.handle('images:bulkUpload', async (event, bookId, sortMethod) => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openDirectory'],
      })

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, error: 'Seçim iptal edildi.' }
      }

      const folderPath = result.filePaths[0]
      const files = fs.readdirSync(folderPath)
      const validExts = ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif']
      
      let imageFiles = files
        .filter(f => validExts.includes(path.extname(f).toLowerCase()))
        .map(f => {
          const fullPath = path.join(folderPath, f)
          const stats = fs.statSync(fullPath)
          return {
            name: f,
            fullPath,
            time: stats.birthtimeMs || stats.mtimeMs
          }
        })

      if (sortMethod === 'date') {
        imageFiles.sort((a, b) => a.time - b.time)
      } else {
        imageFiles.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }))
      }

      const pages = db.prepare('SELECT id, page_number FROM pages WHERE book_id = ? ORDER BY page_number ASC').all(bookId)

      if (imageFiles.length !== pages.length) {
        return { 
          success: false, 
          error: `Eşleşme Hatası: Seçilen klasörde ${imageFiles.length} resim bulundu ancak ciltte ${pages.length} sayfa var. Sayıların eşit olması gerekmektedir.` 
        }
      }

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i]
        const sourcePath = imageFiles[i].fullPath
        
        event.sender.send('images:bulkUploadProgress', { 
          current: i + 1, 
          total: pages.length,
          pageNumber: page.page_number
        })

        const uploadResult = await handleUpload(page.id, sourcePath)
        if (!uploadResult.success) {
          return { success: false, error: `Sayfa ${page.page_number} işlenirken hata oluştu: ${uploadResult.error}` }
        }
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })
}