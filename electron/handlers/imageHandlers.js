import fs from 'fs'
import path from 'path'
import sharp from 'sharp'
import { dialog } from 'electron'

const getStoragePath = (db) =>
  db.prepare('SELECT value FROM settings WHERE key = ?').get('storage_path')
    ?.value || null

const normalizeSide = (side) => (String(side).toUpperCase() === 'B' ? 'B' : 'A')

const ensureDir = (targetPath) => {
  fs.mkdirSync(targetPath, { recursive: true })
}

const buildImagePaths = (storagePath, bookId, pageNumber, side) => {
  const safeSide = normalizeSide(side)
  const baseFolder = path.join(storagePath, 'books', `book_${bookId}`)
  const fileBase = `page_${pageNumber}_${safeSide}`
  return {
    baseFolder,
    originalAbs: path.join(baseFolder, `${fileBase}.jpg`),
    thumbAbs: path.join(baseFolder, `${fileBase}_thumb.jpg`),
    originalRel: path.posix.join('books', `book_${bookId}`, `${fileBase}.jpg`),
    thumbRel: path.posix.join('books', `book_${bookId}`, `${fileBase}_thumb.jpg`),
  }
}

const updatePageImage = (db, pageId, side, relativePath, uploaded) => {
  const safeSide = normalizeSide(side)
  const columnImage = safeSide === 'A' ? 'side_a_image' : 'side_b_image'
  const columnUploaded = safeSide === 'A' ? 'side_a_uploaded' : 'side_b_uploaded'
  db.prepare(
    `UPDATE pages SET ${columnImage} = ?, ${columnUploaded} = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
  ).run(relativePath, uploaded ? 1 : 0, pageId)
}

const getPageInfo = (db, pageId) =>
  db
    .prepare(
      'SELECT pages.id, pages.page_number, pages.book_id, books.name AS book_name FROM pages JOIN books ON pages.book_id = books.id WHERE pages.id = ?'
    )
    .get(pageId)

const resolveStoragePath = (storagePath, targetPath) =>
  path.isAbsolute(targetPath) ? targetPath : path.join(storagePath, targetPath)

export const registerImageHandlers = ({ ipcMain, db }) => {
  const handleUpload = async (pageId, side, sourcePath) => {
    try {
      const storagePath = getStoragePath(db)
      if (!storagePath) {
        return { success: false, error: 'Depolama yolu tanımlı değil.' }
      }

      const page = getPageInfo(db, pageId)
      if (!page) {
        return { success: false, error: 'Sayfa bulunamadı.' }
      }

      const imagePaths = buildImagePaths(
        storagePath,
        page.book_id,
        page.page_number,
        side
      )
      ensureDir(imagePaths.baseFolder)

      await sharp(sourcePath).jpeg({ quality: 92 }).toFile(imagePaths.originalAbs)
      await sharp(sourcePath)
        .resize({ width: 300, withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toFile(imagePaths.thumbAbs)

      updatePageImage(db, pageId, side, imagePaths.originalRel, true)
      return { success: true, data: { imagePath: imagePaths.originalRel } }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  ipcMain.handle('images:upload', async (_event, pageId, side, sourcePath) =>
    handleUpload(pageId, side, sourcePath)
  )

  ipcMain.handle('images:uploadFromDialog', async (_event, pageId, side) => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp'] }],
      })

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, error: 'Seçim iptal edildi.' }
      }

      const sourcePath = result.filePaths[0]
      return await handleUpload(pageId, side, sourcePath)
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('images:delete', (_event, pageId, side) => {
    try {
      const storagePath = getStoragePath(db)
      if (!storagePath) {
        return { success: false, error: 'Depolama yolu tanımlı değil.' }
      }
      const page = db
        .prepare('SELECT book_id, page_number FROM pages WHERE id = ?')
        .get(pageId)
      if (!page) {
        return { success: false, error: 'Sayfa bulunamadı.' }
      }

      const imagePaths = buildImagePaths(
        storagePath,
        page.book_id,
        page.page_number,
        side
      )
      if (fs.existsSync(imagePaths.originalAbs)) {
        fs.unlinkSync(imagePaths.originalAbs)
      }
      if (fs.existsSync(imagePaths.thumbAbs)) {
        fs.unlinkSync(imagePaths.thumbAbs)
      }

      updatePageImage(db, pageId, side, null, false)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('images:export', (_event, imagePaths, destFolder) => {
    try {
      const storagePath = getStoragePath(db)
      if (!storagePath) {
        return { success: false, error: 'Depolama yolu tanımlı değil.' }
      }
      ensureDir(destFolder)

      imagePaths.forEach((imagePath) => {
        const sourceAbs = resolveStoragePath(storagePath, imagePath)
        if (fs.existsSync(sourceAbs)) {
          const fileName = path.basename(sourceAbs)
          fs.copyFileSync(sourceAbs, path.join(destFolder, fileName))
        }
      })

      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('images:getThumbnail', async (_event, imagePath) => {
    try {
      const storagePath = getStoragePath(db)
      if (!storagePath) {
        return { success: false, error: 'Depolama yolu tanımlı değil.' }
      }

      const absPath = resolveStoragePath(storagePath, imagePath)
      if (!fs.existsSync(absPath)) {
        return { success: false, error: 'Resim bulunamadı.' }
      }

      const dir = path.dirname(absPath)
      const base = path.basename(absPath, '.jpg')
      const thumbPath = path.join(dir, `${base}_thumb.jpg`)

      if (!fs.existsSync(thumbPath)) {
        await sharp(absPath)
          .resize({ width: 300, withoutEnlargement: true })
          .jpeg({ quality: 80 })
          .toFile(thumbPath)
      }

      return { success: true, data: thumbPath }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })
}
