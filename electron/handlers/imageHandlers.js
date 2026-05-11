import fs from 'fs'
import path from 'path'
import sharp from 'sharp'
import heicConvert from 'heic-convert'
import { app, dialog, shell } from 'electron'

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

const SUPPORTED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif']
const SUPPORTED_IMAGE_EXTS = new Set(SUPPORTED_IMAGE_EXTENSIONS.map((ext) => `.${ext}`))
const HEIC_EXTS = new Set(['.heic', '.heif'])

const isSupportedImageFile = (fileName) =>
  SUPPORTED_IMAGE_EXTS.has(path.extname(fileName).toLowerCase())

const getFileSortTimestamp = (stats) => {
  const timestamps = [stats.birthtimeMs, stats.mtimeMs].filter(
    (value) => Number.isFinite(value) && value > 0
  )
  return timestamps.length > 0 ? Math.min(...timestamps) : 0
}

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

/**
 * Verilen sharp instance'ına alpha-flatten ve JPEG sıkıştırma uygular,
 * sonucu targetPath'e yazar. quality bir kez dışarıdan geçirilir.
 */
const applyJpegPipeline = async (instance, quality, targetPath) => {
  const metadata = await instance.metadata()
  const pipeline = metadata.hasAlpha
    ? instance.flatten({ background: '#ffffff' })
    : instance
  await pipeline
    .jpeg({ quality, mozjpeg: true, progressive: true, chromaSubsampling: '4:4:4' })
    .toFile(targetPath)
}

const optimizeAndSaveImage = async (sourcePath, targetPath, quality, autoRotate) => {
  const heicBuffer = await convertHeicToBuffer(sourcePath)
  const sharpInput = heicBuffer ?? sourcePath
  let instance = sharp(sharpInput, { failOn: 'none' }).rotate()
  // Auto-rotate: sola (-90) veya sağa (+90)
  if (autoRotate === 'left') instance = instance.rotate(-90)
  else if (autoRotate === 'right') instance = instance.rotate(90)
  await applyJpegPipeline(instance, quality, targetPath)
}

// ─── IPC Handlers ────────────────────────────────────────────────────────────

export const registerImageHandlers = ({ ipcMain, db }) => {
  // Sık kullanılan sorguları bir kez derle
  const stmtGetPageBasic = db.prepare(
    'SELECT book_id, page_number FROM pages WHERE id = ?'
  )

  const getAutoRotate = () => {
    const row = db.prepare("SELECT value FROM settings WHERE key = 'upload_auto_rotate'").get()
    const val = row?.value
    return (val === 'left' || val === 'right') ? val : null
  }

  const handleUpload = async (pageId, sourcePath, quality) => {
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
      await optimizeAndSaveImage(sourcePath, imagePaths.originalAbs, quality ?? getImageQuality(db), getAutoRotate())
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
        filters: [{ name: 'Images', extensions: SUPPORTED_IMAGE_EXTENSIONS }],
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
        filters: [{ name: 'Images', extensions: SUPPORTED_IMAGE_EXTENSIONS }],
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
      await applyJpegPipeline(instance, quality, tempPath)

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
      const entries = fs.readdirSync(folderPath, { withFileTypes: true })

      let imageFiles = entries
        .filter((entry) => entry.isFile() && isSupportedImageFile(entry.name))
        .map((entry) => {
          const fullPath = path.join(folderPath, entry.name)
          const stats = fs.statSync(fullPath)
          return {
            name: entry.name,
            fullPath,
            time: getFileSortTimestamp(stats),
          }
        })

      if (sortMethod === 'date') {
        // En eski çekim/oluşturma zamanı önce gelsin, sonra sayfalara sırayla yazılsın.
        imageFiles.sort((a, b) => a.time - b.time)
      } else {
        imageFiles.sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
        )
      }

      const pages = db.prepare('SELECT id, page_number, book_id FROM pages WHERE book_id = ? ORDER BY page_number ASC').all(bookId)

      if (imageFiles.length !== pages.length) {
        return {
          success: false,
          error: `Eşleşme Hatası: Seçilen klasörde desteklenen formatlarda ${imageFiles.length} resim bulundu ancak ciltte ${pages.length} sayfa var. Sadece izin verilen resim dosyaları dikkate alınır ve sayıların eşit olması gerekir.`
        }
      }

      const storagePath = getStoragePath(db)
      if (!storagePath) {
        return { success: false, error: 'Depolama yolu tanımlı değil.' }
      }

      const quality = getImageQuality(db)
      const autoRotate = getAutoRotate()

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i]
        const sourcePath = imageFiles[i].fullPath

        event.sender.send('images:bulkUploadProgress', {
          current: i + 1,
          total: pages.length,
          pageNumber: page.page_number
        })

        const imagePaths = buildImagePaths(storagePath, page.book_id ?? bookId, page.page_number)
        ensureDir(imagePaths.baseFolder)

        try {
          await optimizeAndSaveImage(sourcePath, imagePaths.originalAbs, quality, autoRotate)
          removeIfExists(imagePaths.legacyThumbAbs)
          updatePageImage(db, page.id, imagePaths.originalRel, true)
        } catch (err) {
          return { success: false, error: `Sayfa ${page.page_number} işlenirken hata oluştu: ${err.message}` }
        }
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  // Resmi masaüstüne kopyala
  // force=false → çakışma varsa conflict döndür, force=true → yeni ad oluşturarak kopyala
  ipcMain.handle('images:copyToDesktop', async (_event, payload) => {
    try {
      const { relativePath, force = false } = typeof payload === 'string'
        ? { relativePath: payload }
        : payload

      const storagePath = getStoragePath(db)
      if (!storagePath) return { success: false, error: 'Depolama yolu bulunamadı.' }

      const sourceAbs = resolveStoragePath(storagePath, relativePath)
      if (!fs.existsSync(sourceAbs)) {
        return { success: false, error: 'Kaynak dosya bulunamadı.' }
      }

      // DB'den cilt adı ve sayfa numarasını çek (image path üzerinden eşleştir)
      // relativePath posix formatında saklanır, normalize ederek karşılaştır
      const normalizedRel = relativePath.replace(/\\/g, '/')
      const pageRow = db
        .prepare(
          `SELECT pages.page_number, books.name AS book_name
           FROM pages
           JOIN books ON pages.book_id = books.id
           WHERE REPLACE(pages.image, '\\', '/') = ?`
        )
        .get(normalizedRel)

      const ext = path.extname(sourceAbs) || '.jpg'

      // Dosya adı oluştur: Cilt-{bookName}_sayfa-{pageNumber}
      // Dosya sistemi için güvensiz karakterleri temizle
      let baseName
      if (pageRow) {
        const safeName = pageRow.book_name.replace(/[\\/:*?"<>|]/g, '_').trim()
        baseName = `Cilt-${safeName}_sayfa-${pageRow.page_number}`
      } else {
        // Sayfa bulunamazsa orijinal dosya adını kullan
        baseName = path.basename(sourceAbs, ext)
      }

      const desktopPath = app.getPath('desktop')
      const originalDest = path.join(desktopPath, `${baseName}${ext}`)

      // Çakışma var ve kullanıcı henüz onay vermedi
      if (fs.existsSync(originalDest) && !force) {
        return { success: false, conflict: true, fileName: `${baseName}${ext}` }
      }

      // force=true ise numaralı yeni ad üret
      let destPath = originalDest
      if (force && fs.existsSync(originalDest)) {
        let counter = 1
        do {
          destPath = path.join(desktopPath, `${baseName}_${counter}${ext}`)
          counter++
        } while (fs.existsSync(destPath))
      }

      fs.copyFileSync(sourceAbs, destPath)
      return { success: true, destPath }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })


  // İndirilen resmi varsayılan uygulamada aç
  ipcMain.handle('images:openFile', async (_event, filePath) => {
    try {
      await shell.openPath(filePath)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  // Resmi yazdır – gizli pencere açıp OS yazdırma ekranını tetikler
  ipcMain.handle('images:print', async (_event, imagePath) => {
    const { BrowserWindow } = await import('electron')
    let printWin = null
    try {
      const storagePath = getStoragePath(db)
      if (!storagePath) {
        return { success: false, error: 'Depolama yolu tanımlı değil.' }
      }

      const absPath = resolveStoragePath(storagePath, imagePath)
      if (!fs.existsSync(absPath)) {
        return { success: false, error: 'Resim bulunamadı.' }
      }

      // Resmi base64 olarak oku – böylece data:text/html içinde sorunsuz gösterilir
      const imgBuffer = fs.readFileSync(absPath)
      const ext = path.extname(absPath).toLowerCase().replace('.', '')
      const mimeMap = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' }
      const mime = mimeMap[ext] || 'image/jpeg'
      const base64 = imgBuffer.toString('base64')

      printWin = new BrowserWindow({
        show: false,
        width: 800,
        height: 600,
        webPreferences: { nodeIntegration: false, contextIsolation: true },
      })

      const html = `<!DOCTYPE html>
<html><head><style>
  @page { margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 100%; height: 100%; background: #fff; }
  body { display: flex; align-items: center; justify-content: center; }
  img { max-width: 100%; max-height: 100%; object-fit: contain; }
</style></head><body><img src="data:${mime};base64,${base64}" /></body></html>`

      await printWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)

      await new Promise((resolve) => {
        printWin.webContents.print({ silent: false }, (_success, _failureReason) => {
          resolve()
        })
      })

      printWin.destroy()
      printWin = null
      return { success: true }
    } catch (error) {
      if (printWin) printWin.destroy()
      return { success: false, error: error.message }
    }
  })
}