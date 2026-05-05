import fs from 'fs'
import path from 'path'

const getStoragePath = (db) =>
  db.prepare('SELECT value FROM settings WHERE key = ?').get('storage_path')
    ?.value || null

const removeIfExists = (targetPath) => {
  if (!targetPath) return
  if (fs.existsSync(targetPath)) {
    fs.rmSync(targetPath, { recursive: true, force: true })
  }
}

export const registerBookHandlers = ({ ipcMain, db }) => {
  ipcMain.handle('books:getAll', () => {
    try {
      const rows = db
        .prepare('SELECT * FROM books ORDER BY created_at DESC')
        .all()
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

  ipcMain.handle('books:create', (_event, data) => {
    try {
      const stmt = db.prepare(
        'INSERT INTO books (name, description, book_notes, total_pages, cover_image, storage_folder) VALUES (?, ?, ?, ?, ?, ?)'
      )
      const result = stmt.run(
        data.name,
        data.description || null,
        data.book_notes || null,
        data.total_pages || 0,
        data.cover_image || null,
        data.storage_folder || null
      )
      const book = db.prepare('SELECT * FROM books WHERE id = ?').get(result.lastInsertRowid)
      return { success: true, data: book }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('books:update', (_event, id, data) => {
    try {
      db.prepare(
        'UPDATE books SET name = ?, description = ?, book_notes = ?, total_pages = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
      ).run(data.name, data.description || null, data.book_notes || null, data.total_pages || 0, id)
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

  ipcMain.handle('books:setCover', (_event, id, imagePath) => {
    try {
      db.prepare('UPDATE books SET cover_image = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(
        imagePath,
        id
      )
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })
}
