// ─── Prepared Statement Cache ────────────────────────────────────────────────
// Sorgular modül ömrü boyunca bir kez derlenir; her handler çağrısında
// yeniden parse edilmez.

let _stmts = null
const stmts = (db) => {
  if (_stmts) return _stmts
  _stmts = {
    getByBook: db.prepare('SELECT * FROM pages WHERE book_id = ? ORDER BY page_number ASC'),
    getById: db.prepare(
      'SELECT pages.*, books.name AS book_name FROM pages JOIN books ON pages.book_id = books.id WHERE pages.id = ?'
    ),
    create: db.prepare('INSERT INTO pages (book_id, page_number, page_notes) VALUES (?, ?, ?)'),
    getCreated: db.prepare('SELECT * FROM pages WHERE id = ?'),
    update: db.prepare('UPDATE pages SET page_notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'),
    bulkInsert: db.prepare('INSERT INTO pages (book_id, page_number) VALUES (?, ?)'),
    delete: db.prepare('DELETE FROM pages WHERE id = ?'),
  }
  return _stmts
}

// ─── IPC Handler Kayıt Fonksiyonu ────────────────────────────────────────────

export const registerPageHandlers = ({ ipcMain, db }) => {

  // ── Cilde Göre Sayfaları Getir ────────────────────────────────────────────
  ipcMain.handle('pages:getByBook', (_event, bookId) => {
    try {
      return { success: true, data: stmts(db).getByBook.all(bookId) }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  // ── ID'ye Göre Sayfa Getir ────────────────────────────────────────────────
  ipcMain.handle('pages:getById', (_event, id) => {
    try {
      return { success: true, data: stmts(db).getById.get(id) }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  // ── Sayfa Oluştur ─────────────────────────────────────────────────────────
  ipcMain.handle('pages:create', (_event, data) => {
    try {
      const s = stmts(db)
      const { lastInsertRowid } = s.create.run(
        data.book_id,
        data.page_number,
        data.page_notes ?? null
      )
      return { success: true, data: s.getCreated.get(lastInsertRowid) }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  // ── Toplu Sayfa Oluştur ───────────────────────────────────────────────────
  ipcMain.handle('pages:bulkCreate', (_event, bookId, count) => {
    try {
      const s = stmts(db)
      db.transaction(() => {
        for (let i = 1; i <= count; i++) s.bulkInsert.run(bookId, i)
      })()
      return { success: true, data: s.getByBook.all(bookId) }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  // ── Sayfa Güncelle ────────────────────────────────────────────────────────
  ipcMain.handle('pages:update', (_event, id, data) => {
    try {
      const s = stmts(db)
      s.update.run(data.page_notes ?? null, id)
      return { success: true, data: s.getCreated.get(id) }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  // ── Sayfa Sil ─────────────────────────────────────────────────────────────
  ipcMain.handle('pages:delete', (_event, id) => {
    try {
      stmts(db).delete.run(id)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })
}