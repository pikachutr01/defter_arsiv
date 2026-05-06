const buildBookResults = (rows) =>
  rows.map((row) => {
    const sources = []

    if (row.name) sources.push({ label: 'Cilt Adı', text: row.name })
    if (row.description) sources.push({ label: 'Açıklama', text: row.description })
    if (row.book_notes) sources.push({ label: 'Cilt Notu', text: row.book_notes })

    return {
      id: `book-${row.id}`,
      result_type: 'book',
      book_id: row.id,
      title: row.name,
      description: row.description,
      cover_image: row.cover_image,
      total_pages: row.total_pages,
      match_sources: sources,
    }
  })

const buildPageResults = (rows) =>
  rows.map((row) => {
    const sources = []

    if (row.page_notes) sources.push({ label: 'Sayfa Notu', text: row.page_notes })

    return {
      id: `page-${row.id}`,
      result_type: 'page',
      page_id: row.id,
      book_id: row.book_id,
      page_number: row.page_number,
      book_name: row.book_name,
      match_sources: sources,
    }
  })

let _stmts = null
const stmts = (db) => {
  if (_stmts) return _stmts
  _stmts = {
    bookAll: db.prepare(`
      SELECT id, name, description, book_notes, cover_image, total_pages
      FROM books
      WHERE (
        name LIKE ?
        OR COALESCE(description, '') LIKE ?
        OR COALESCE(book_notes, '') LIKE ?
      )
      ORDER BY name COLLATE NOCASE ASC
    `),
    bookWithId: db.prepare(`
      SELECT id, name, description, book_notes, cover_image, total_pages
      FROM books
      WHERE (
        name LIKE ?
        OR COALESCE(description, '') LIKE ?
        OR COALESCE(book_notes, '') LIKE ?
      )
      AND id = ?
      ORDER BY name COLLATE NOCASE ASC
    `),
    pageAll: db.prepare(`
      SELECT pages.id, pages.book_id, pages.page_number, pages.page_notes,
             books.name AS book_name
      FROM pages
      JOIN books ON pages.book_id = books.id
      WHERE (COALESCE(pages.page_notes, '') LIKE ?)
      ORDER BY books.name COLLATE NOCASE ASC, pages.page_number ASC
    `),
    pageWithNum: db.prepare(`
      SELECT pages.id, pages.book_id, pages.page_number, pages.page_notes,
             books.name AS book_name
      FROM pages
      JOIN books ON pages.book_id = books.id
      WHERE (COALESCE(pages.page_notes, '') LIKE ? OR pages.page_number = ?)
      ORDER BY books.name COLLATE NOCASE ASC, pages.page_number ASC
    `),
    pageAllWithId: db.prepare(`
      SELECT pages.id, pages.book_id, pages.page_number, pages.page_notes,
             books.name AS book_name
      FROM pages
      JOIN books ON pages.book_id = books.id
      WHERE (COALESCE(pages.page_notes, '') LIKE ?)
      AND books.id = ?
      ORDER BY books.name COLLATE NOCASE ASC, pages.page_number ASC
    `),
    pageWithNumAndId: db.prepare(`
      SELECT pages.id, pages.book_id, pages.page_number, pages.page_notes,
             books.name AS book_name
      FROM pages
      JOIN books ON pages.book_id = books.id
      WHERE (COALESCE(pages.page_notes, '') LIKE ? OR pages.page_number = ?)
      AND books.id = ?
      ORDER BY books.name COLLATE NOCASE ASC, pages.page_number ASC
    `),
  }
  return _stmts
}

export const registerSearchHandlers = ({ ipcMain, db }) => {
  ipcMain.handle('search:query', (_event, text, bookId) => {
    try {
      if (!text || !text.trim()) {
        return { success: true, data: [] }
      }

      const trimmed = text.trim()
      const likeValue = `%${trimmed}%`
      const pageNumber = Number.parseInt(trimmed, 10)
      const hasPageNumber = !Number.isNaN(pageNumber)

      const s = stmts(db)
      let bookRows = []
      let pageRows = []

      if (bookId) {
        bookRows = s.bookWithId.all(likeValue, likeValue, likeValue, bookId)
        if (hasPageNumber) {
          pageRows = s.pageWithNumAndId.all(likeValue, pageNumber, bookId)
        } else {
          pageRows = s.pageAllWithId.all(likeValue, bookId)
        }
      } else {
        bookRows = s.bookAll.all(likeValue, likeValue, likeValue)
        if (hasPageNumber) {
          pageRows = s.pageWithNum.all(likeValue, pageNumber)
        } else {
          pageRows = s.pageAll.all(likeValue)
        }
      }

      const results = [...buildBookResults(bookRows), ...buildPageResults(pageRows)]
      return { success: true, data: results }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })
}
