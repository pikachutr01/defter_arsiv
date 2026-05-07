import fs from 'fs'
import path from 'path'
import sharp from 'sharp'
import { dialog } from 'electron'

// ─── Constants ───────────────────────────────────────────────────────────────

const COVER_MAX_SIZE = 1600
const COVER_QUALITY = 80

const bookNameCollator = new Intl.Collator('tr', {
  numeric: true,
  sensitivity: 'base',
})

// ─── Helpers ─────────────────────────────────────────────────────────────────

let _cachedStoragePath = undefined
const getStoragePath = (db) => {
  if (_cachedStoragePath !== undefined) return _cachedStoragePath
  _cachedStoragePath =
    db.prepare('SELECT value FROM settings WHERE key = ?').get('storage_path')
      ?.value ?? null
  return _cachedStoragePath
}

const removeIfExists = (targetPath) => {
  if (!targetPath || !fs.existsSync(targetPath)) return
  fs.rmSync(targetPath, { recursive: true, force: true })
}

const saveCoverImage = async (storagePath, bookId, sourcePath) => {
  const coversDir = path.join(storagePath, 'covers')
  fs.mkdirSync(coversDir, { recursive: true })

  const targetPath = path.join(coversDir, `book_${bookId}.jpg`)

  // sharp instance'ı bir kez oluştur, metadata ve pipeline ayrı ayrı açılmasın
  const instance = sharp(sourcePath, { failOn: 'none' }).rotate()
  const metadata = await instance.metadata()

  const pipeline = metadata.hasAlpha
    ? instance.flatten({ background: '#ffffff' })
    : instance

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
  if (!storagePath) return null

  const coverPath = path.join(storagePath, 'covers', `book_${bookId}.jpg`)

  if (data.remove_cover) {
    removeIfExists(coverPath)
    db.prepare(
      'UPDATE books SET cover_image = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(bookId)
    return null
  }

  if (data.cover_source_path) {
    const relativeCoverPath = await saveCoverImage(
      storagePath,
      bookId,
      data.cover_source_path
    )
    db.prepare(
      'UPDATE books SET cover_image = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(relativeCoverPath, bookId)
    return relativeCoverPath
  }

  // Kapak değişikliği yoksa mevcut değeri tek sorguda al
  return (
    db.prepare('SELECT cover_image FROM books WHERE id = ?').get(bookId)
      ?.cover_image ?? null
  )
}

// ─── Prepared Statements (modül yüklenirken değil, handler register'da init edilir) ──

const buildStatements = (db) => ({
  getAllBooks: db.prepare(`
    SELECT b.*,
           COALESCE(SUM(p.is_uploaded), 0) AS image_count
    FROM books b
    LEFT JOIN pages p ON p.book_id = b.id
    GROUP BY b.id
    ORDER BY b.created_at DESC
  `),
  getById: db.prepare('SELECT * FROM books WHERE id = ?'),
  checkDuplicateName: db.prepare(
    'SELECT id FROM books WHERE name = ? COLLATE NOCASE AND id != ?'
  ),
  checkDuplicateNameNew: db.prepare(
    'SELECT id FROM books WHERE name = ? COLLATE NOCASE'
  ),
  insertBook: db.prepare(
    'INSERT INTO books (name, description, book_notes, total_pages, cover_image, storage_folder) VALUES (?, ?, ?, ?, ?, ?)'
  ),
  updateBook: db.prepare(
    'UPDATE books SET name = ?, description = ?, book_notes = ?, total_pages = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  ),
  deleteBook: db.prepare('DELETE FROM books WHERE id = ?'),
})

// ─── IPC Handlers ────────────────────────────────────────────────────────────

export const registerBookHandlers = ({ ipcMain, db }) => {
  const stmt = buildStatements(db)

  ipcMain.handle('books:getAll', () => {
    try {
      const rows = stmt.getAllBooks
        .all()
        .sort((a, b) => bookNameCollator.compare(a.name || '', b.name || ''))
      return { success: true, data: rows }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('books:getById', (_event, id) => {
    try {
      const row = stmt.getById.get(id)
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
      const existing = stmt.checkDuplicateNameNew.get(data.name)
      if (existing) {
        return {
          success: false,
          error: 'Bu isimde bir cilt zaten var. Lütfen farklı bir isim girin.',
        }
      }

      const result = stmt.insertBook.run(
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

      const book = stmt.getById.get(bookId)
      return { success: true, data: book }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('books:update', async (_event, id, data) => {
    try {
      const existing = stmt.checkDuplicateName.get(data.name, id)
      if (existing) {
        return {
          success: false,
          error: 'Bu isimde bir cilt zaten var. Lütfen farklı bir isim girin.',
        }
      }

      const currentBook = stmt.getById.get(id)
      const currentTotal = currentBook.total_pages
      const newTotal = data.total_pages || 0

      if (newTotal < currentTotal) {
        const hasData = db.prepare('SELECT id FROM pages WHERE book_id = ? AND page_number > ? AND (is_uploaded = 1 OR page_notes IS NOT NULL) LIMIT 1').get(id, newTotal)
        if (hasData) {
          return {
            success: false,
            error: `Sayfa sayısını ${newTotal}'a düşüremezsiniz. Çünkü silinecek olan ${newTotal + 1} ile ${currentTotal} numaralı sayfalar arasında not veya resim içeren kayıtlar var. Lütfen önce o sayfaları temizleyin.`
          }
        }
        
        db.prepare('DELETE FROM pages WHERE book_id = ? AND page_number > ?').run(id, newTotal)
      } else if (newTotal > currentTotal) {
        const insertStmt = db.prepare('INSERT INTO pages (book_id, page_number) VALUES (?, ?)')
        db.transaction(() => {
          for (let i = currentTotal + 1; i <= newTotal; i++) {
            insertStmt.run(id, i)
          }
        })()
      }

      stmt.updateBook.run(
        data.name,
        data.description || null,
        data.book_notes || null,
        newTotal,
        id
      )

      await applyCoverChanges(db, id, data)

      const book = stmt.getById.get(id)
      return { success: true, data: book }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('books:delete', (_event, id) => {
    try {
      const storagePath = getStoragePath(db)
      if (storagePath) {
        removeIfExists(path.join(storagePath, 'covers', `book_${id}.jpg`))
        removeIfExists(path.join(storagePath, 'books', `book_${id}`))
      }

      stmt.deleteBook.run(id)
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