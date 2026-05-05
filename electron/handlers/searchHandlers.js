export const registerSearchHandlers = ({ ipcMain, db }) => {
  ipcMain.handle('search:query', (_event, text, bookId) => {
    try {
      if (!text || !text.trim()) {
        return { success: true, data: [] }
      }

      const trimmed = text.trim()
      const query = `${trimmed}*`
      const pageNumber = Number.parseInt(trimmed, 10)
      let sql = `
        SELECT DISTINCT pages.id, pages.book_id, pages.page_number, pages.page_notes, pages.side_a_notes, pages.side_b_notes,
               pages.side_a_image, pages.side_b_image, books.name AS book_name
        FROM pages_fts
        JOIN pages ON pages_fts.rowid = pages.id
        JOIN books ON pages.book_id = books.id
        WHERE pages_fts MATCH ? OR books.name LIKE ? OR pages.page_number = ?
      `
      const params = [query, `%${trimmed}%`, Number.isNaN(pageNumber) ? -1 : pageNumber]
      if (bookId) {
        sql += ' AND books.id = ?'
        params.push(bookId)
      }
      sql += ' ORDER BY pages.book_id, pages.page_number ASC'

      const rows = db.prepare(sql).all(...params)
      return { success: true, data: rows }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })
}
