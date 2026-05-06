import fs from 'fs'
import path from 'path'
import sharp from 'sharp'
import { dialog } from 'electron'

const COVER_MAX_SIZE = 1600
const COVER_QUALITY = 80
const bookNameCollator = new Intl.Collator('tr', {
  numeric: true,
  sensitivity: 'base',
})

const getStoragePath = (db) =>
  db.prepare('SELECT value FROM settings WHERE key = ?').get('storage_path')
    ?.value || null

const removeIfExists = (targetPath) => {
  if (!targetPath) return
  if (fs.existsSync(targetPath)) {
    fs.rmSync(targetPath, { recursive: true, force: true })
  }
}

const saveCoverImage = async (storagePath, bookId, sourcePath) => {
  const coversDir = path.join(storagePath, 'covers')
  fs.mkdirSync(coversDir, { recursive: true })

  const targetPath = path.join(coversDir, `book_${bookId}.jpg`)
  let pipeline = sharp(sourcePath, { failOn: 'none' }).rotate()
  const metadata = await pipeline.metadata()

  if (metadata.hasAlpha) {
    pipeline = pipeline.flatten({ background: '#ffffff' })
  }

  await pipeline
    .resize({
      width: COVER_MAX_SIZE,
      height: COVER_MAX_SIZE,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({
      quality: COVER_QUALITY,
      mozjpeg: true,
      progressive: true,
      chromaSubsampling: '4:4:4',
    })
    .toFile(targetPath)

  return path.posix.join('covers', `book_${bookId}.jpg`)
}

const applyCoverChanges = async (db, bookId, data) => {
  const storagePath = getStoragePath(db)
  if (!storagePath) {
    return null
  }

  const currentBook = db.prepare('SELECT cover_image FROM books WHERE id = ?').get(bookId)
  const coverPath = path.join(storagePath, 'covers', `book_${bookId}.jpg`)

  if (data.remove_cover) {
    removeIfExists(coverPath)
    db.prepare(
      'UPDATE books SET cover_image = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(bookId)
    return null
  }

  if (data.cover_source_path) {
    const relativeCoverPath = await saveCoverImage(storagePath, bookId, data.cover_source_path)
    db.prepare(
      'UPDATE books SET cover_image = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(relativeCoverPath, bookId)
    return relativeCoverPath
  }

  return currentBook?.cover_image || null
}

export const registerBookHandlers = ({ ipcMain, db }) => {
  ipcMain.handle('books:getAll', () => {
    try {
      const rows = db
        .prepare(
          `SELECT b.*,
            COALESCE(SUM(p.is_uploaded), 0) AS image_count
           FROM books b
           LEFT JOIN pages p ON p.book_id = b.id
           GROUP BY b.id
           ORDER BY b.created_at DESC`
        )
        .all()
        .sort((left, right) => bookNameCollator.compare(left.name || '', right.name || ''))
      return { success: true, data: rows }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('books:getById', (_event, id) => {
    try {
      const row = db.prepare('SELECT * FROM books WHERE id = ?').get(id)
      return { success: true, data: row }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('books:chooseCover', async () => {
    try {
      const result = await dialog.showOpenDialog({
        title: 'Kapak görseli seçin',
        properties: ['openFile'],
        filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp'] }],
      })

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, canceled: true }
      }

      return { success: true, data: result.filePaths[0] }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('books:create', async (_event, data) => {
    try {
      const existing = db.prepare('SELECT id FROM books WHERE name = ? COLLATE NOCASE').get(data.name)
      if (existing) {
        return { success: false, error: 'Bu isimde bir cilt zaten var. Lütfen farklı bir isim girin.' }
      }

      const stmt = db.prepare(
        'INSERT INTO books (name, description, book_notes, total_pages, cover_image, storage_folder) VALUES (?, ?, ?, ?, ?, ?)'
      )
      const result = stmt.run(
        data.name,
        data.description || null,
        data.book_notes || null,
        data.total_pages || 0,
        null,
        data.storage_folder || null
      )

      const bookId = result.lastInsertRowid
      if (data.cover_source_path) {
        await applyCoverChanges(db, bookId, data)
      }

      const book = db.prepare('SELECT * FROM books WHERE id = ?').get(bookId)
      return { success: true, data: book }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('books:update', async (_event, id, data) => {
    try {
      const existing = db.prepare('SELECT id FROM books WHERE name = ? COLLATE NOCASE AND id != ?').get(data.name, id)
      if (existing) {
        return { success: false, error: 'Bu isimde bir cilt zaten var. Lütfen farklı bir isim girin.' }
      }

      db.prepare(
        'UPDATE books SET name = ?, description = ?, book_notes = ?, total_pages = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
      ).run(data.name, data.description || null, data.book_notes || null, data.total_pages || 0, id)

      await applyCoverChanges(db, id, data)

      const book = db.prepare('SELECT * FROM books WHERE id = ?').get(id)
      return { success: true, data: book }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('books:delete', (_event, id) => {
    try {
      const storagePath = getStoragePath(db)
      if (storagePath) {
        const coverPath = path.join(storagePath, 'covers', `book_${id}.jpg`)
        const bookFolder = path.join(storagePath, 'books', `book_${id}`)
        removeIfExists(coverPath)
        removeIfExists(bookFolder)
      }

      db.prepare('DELETE FROM books WHERE id = ?').run(id)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('books:setCover', async (_event, id, imagePath) => {
    try {
      const relativeCoverPath = await applyCoverChanges(db, id, {
        cover_source_path: imagePath,
      })
      return { success: true, data: relativeCoverPath }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })
}
