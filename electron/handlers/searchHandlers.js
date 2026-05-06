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

export const registerSearchHandlers = ({ ipcMain, db }) => {
  ipcMain.handle('search:query', (_event, text, bookId) => {
    try {
      if (!text || !text.trim()) {
        return { success: true, data: [] }
      }

      const trimmed = text.trim()
      const likeValue = `%${trimmed}%`
      const pageNumber = Number.parseInt(trimmed, 10)

      let bookSql = `
        SELECT id, name, description, book_notes, cover_image, total_pages
        FROM books
        WHERE (
          name LIKE ?
          OR COALESCE(description, '') LIKE ?
          OR COALESCE(book_notes, '') LIKE ?
        )
      `
      const bookParams = [likeValue, likeValue, likeValue]

      let pageSql = `
        SELECT pages.id, pages.book_id, pages.page_number, pages.page_notes,
               books.name AS book_name
        FROM pages
        JOIN books ON pages.book_id = books.id
        WHERE (
          COALESCE(pages.page_notes, '') LIKE ?
      `
      const pageParams = [likeValue]

      if (!Number.isNaN(pageNumber)) {
        pageSql += ' OR pages.page_number = ?'
        pageParams.push(pageNumber)
      }

      pageSql += ')'

      if (bookId) {
        bookSql += ' AND id = ?'
        pageSql += ' AND books.id = ?'
        bookParams.push(bookId)
        pageParams.push(bookId)
      }

      bookSql += ' ORDER BY name COLLATE NOCASE ASC'
      pageSql += ' ORDER BY books.name COLLATE NOCASE ASC, pages.page_number ASC'

      const bookRows = db.prepare(bookSql).all(...bookParams)
      const pageRows = db.prepare(pageSql).all(...pageParams)

      const results = [...buildBookResults(bookRows), ...buildPageResults(pageRows)]
      return { success: true, data: results }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })
}
