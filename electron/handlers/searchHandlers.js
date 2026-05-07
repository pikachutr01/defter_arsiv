export const registerSearchHandlers = ({ ipcMain, db }) => {
  ipcMain.handle('search:query', (_event, payload) => {
    try {
      // Geriye dönük uyumluluk: eğer sadece string gelirse
      const options = typeof payload === 'string' ? { text: payload } : payload
      const { text, bookId, type = 'all', page = 1, limit = 50 } = options

      if (!text || !text.trim()) {
        return { success: true, data: { results: [], totalResults: 0, totalPages: 0, currentPage: page } }
      }

      const trimmed = text.trim()
      const likeValue = `%${trimmed}%`
      const offset = (page - 1) * limit

      const bookParams = []
      const pageParams = []

      let bookWhere = ""
      let pageWhere = ""

      if (type === 'all') {
        bookWhere = `(name LIKE ? OR COALESCE(description, '') LIKE ? OR COALESCE(book_notes, '') LIKE ?)`
        bookParams.push(likeValue, likeValue, likeValue)

        pageWhere = `(CAST(pages.page_number AS TEXT) LIKE ? OR COALESCE(pages.page_notes, '') LIKE ?)`
        pageParams.push(likeValue, likeValue)
      } else if (type === 'book') {
        bookWhere = `(name LIKE ?)`
        bookParams.push(likeValue)
      } else if (type === 'page') {
        pageWhere = `(CAST(pages.page_number AS TEXT) LIKE ?)`
        pageParams.push(likeValue)
      } else if (type === 'note') {
        bookWhere = `(COALESCE(description, '') LIKE ? OR COALESCE(book_notes, '') LIKE ?)`
        bookParams.push(likeValue, likeValue)

        pageWhere = `(COALESCE(pages.page_notes, '') LIKE ?)`
        pageParams.push(likeValue)
      }

      if (bookId) {
        if (bookWhere) {
          bookWhere += ` AND id = ?`
          bookParams.push(bookId)
        }
        if (pageWhere) {
          pageWhere += ` AND books.id = ?`
          pageParams.push(bookId)
        }
      }

      let queryStr = ""
      let queryParams = []

      const selectBook = `
        SELECT 'book' as entity_type, id as entity_id, id as book_id, NULL as page_id, NULL as page_number, 
               name as book_name, name as title, description, book_notes as match_notes, cover_image, total_pages 
        FROM books
        ${bookWhere ? 'WHERE ' + bookWhere : 'WHERE 0'}
      `

      const selectPage = `
        SELECT 'page' as entity_type, pages.id as entity_id, books.id as book_id, pages.id as page_id, pages.page_number, 
               books.name as book_name, books.name as title, NULL as description, pages.page_notes as match_notes, NULL as cover_image, NULL as total_pages
        FROM pages
        JOIN books ON pages.book_id = books.id
        ${pageWhere ? 'WHERE ' + pageWhere : 'WHERE 0'}
      `

      if (type === 'all' || type === 'note') {
        queryStr = `
           ${selectBook}
           UNION ALL
           ${selectPage}
           ORDER BY title COLLATE NOCASE ASC, entity_type ASC, page_number ASC
         `
        queryParams = [...bookParams, ...pageParams]
      } else if (type === 'book') {
        queryStr = `
           ${selectBook}
           ORDER BY title COLLATE NOCASE ASC
         `
        queryParams = [...bookParams]
      } else if (type === 'page') {
        queryStr = `
           ${selectPage}
           ORDER BY title COLLATE NOCASE ASC, page_number ASC
         `
        queryParams = [...pageParams]
      }

      const countQuery = `SELECT COUNT(*) as count FROM (${queryStr})`
      const countResult = db.prepare(countQuery).get(...queryParams)
      const totalResults = countResult.count
      const totalPages = Math.ceil(totalResults / limit)

      const finalQuery = `
        ${queryStr}
        LIMIT ? OFFSET ?
      `
      queryParams.push(limit, offset)

      const rows = db.prepare(finalQuery).all(...queryParams)

      const results = rows.map(row => {
        const sources = []
        const searchLower = trimmed.toLocaleLowerCase('tr')

        if (row.entity_type === 'book') {
          if (type === 'all' || type === 'book') {
            if (row.title && row.title.toLocaleLowerCase('tr').includes(searchLower)) {
              sources.push({ label: 'Cilt Adı', text: row.title })
            }
          }
          if (type === 'all' || type === 'note') {
            if (row.description && row.description.toLocaleLowerCase('tr').includes(searchLower)) {
              sources.push({ label: 'Açıklama', text: row.description })
            }
            if (row.match_notes && row.match_notes.toLocaleLowerCase('tr').includes(searchLower)) {
              sources.push({ label: 'Cilt Notu', text: row.match_notes })
            }
          }
          if (sources.length === 0 && row.title) sources.push({ label: 'Cilt Adı', text: row.title })

          return {
            id: `book-${row.entity_id}`,
            result_type: 'book',
            book_id: row.book_id,
            title: row.title,
            description: row.description,
            cover_image: row.cover_image,
            total_pages: row.total_pages,
            match_sources: sources,
          }
        } else {
          if (type === 'all' || type === 'page') {
            if (String(row.page_number).includes(trimmed)) {
              sources.push({ label: 'Sayfa No', text: `Sayfa ${row.page_number}` })
            }
          }
          if (type === 'all' || type === 'note') {
            if (row.match_notes && row.match_notes.toLocaleLowerCase('tr').includes(searchLower)) {
              sources.push({ label: 'Sayfa Notu', text: row.match_notes })
            }
          }
          if (sources.length === 0) sources.push({ label: 'Sayfa', text: `Sayfa ${row.page_number}` })

          return {
            id: `page-${row.entity_id}`,
            result_type: 'page',
            page_id: row.page_id,
            book_id: row.book_id,
            page_number: row.page_number,
            book_name: row.book_name,
            match_sources: sources,
          }
        }
      })

      return { success: true, data: { results, totalResults, totalPages, currentPage: page } }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })
}
