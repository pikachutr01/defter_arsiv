export const registerPageHandlers = ({ ipcMain, db }) => {
  ipcMain.handle('pages:getByBook', (_event, bookId) => {
    try {
      const rows = db
        .prepare('SELECT * FROM pages WHERE book_id = ? ORDER BY page_number ASC')
        .all(bookId)
      return { success: true, data: rows }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('pages:getById', (_event, id) => {
    try {
      const row = db
        .prepare(
          'SELECT pages.*, books.name AS book_name FROM pages JOIN books ON pages.book_id = books.id WHERE pages.id = ?'
        )
        .get(id)
      return { success: true, data: row }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('pages:create', (_event, data) => {
    try {
      const stmt = db.prepare(
        'INSERT INTO pages (book_id, page_number, page_notes) VALUES (?, ?, ?)'
      )
      const result = stmt.run(
        data.book_id,
        data.page_number,
        data.page_notes || null
      )
      const row = db.prepare('SELECT * FROM pages WHERE id = ?').get(result.lastInsertRowid)
      return { success: true, data: row }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('pages:bulkCreate', (_event, bookId, count) => {
    try {
      const insert = db.prepare(
        'INSERT INTO pages (book_id, page_number) VALUES (?, ?)'
      )
      const transaction = db.transaction((book, total) => {
        for (let i = 1; i <= total; i += 1) {
          insert.run(book, i)
        }
      })
      transaction(bookId, count)
      const rows = db
        .prepare('SELECT * FROM pages WHERE book_id = ? ORDER BY page_number ASC')
        .all(bookId)
      return { success: true, data: rows }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('pages:update', (_event, id, data) => {
    try {
      db.prepare(
        'UPDATE pages SET page_notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
      ).run(data.page_notes || null, id)
      const row = db.prepare('SELECT * FROM pages WHERE id = ?').get(id)
      return { success: true, data: row }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('pages:delete', (_event, id) => {
    try {
      db.prepare('DELETE FROM pages WHERE id = ?').run(id)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })
}
