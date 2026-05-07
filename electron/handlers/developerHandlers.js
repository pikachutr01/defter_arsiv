// ─── Whitelist'ler ───────────────────────────────────────────────────────────

const ALLOWED_TABLES = new Set(['books', 'pages', 'settings'])

const ALLOWED_FIELDS = {
  books: new Set(['name', 'description', 'book_notes', 'total_pages', 'storage_folder']),
  pages: new Set(['page_number', 'page_notes']),
  settings: new Set(['value']),
}

const PK_FIELD = { books: 'id', pages: 'id', settings: 'key' }

// ─── IPC Handlers ────────────────────────────────────────────────────────────

export const registerDeveloperHandlers = ({ ipcMain, db }) => {
  ipcMain.handle(
    'dev:getTableData',
    (_event, { table, limit = 50, offset = 0, bookId = null }) => {
      try {
        if (!ALLOWED_TABLES.has(table)) {
          throw new Error('Geçersiz tablo.')
        }

        const pkField = PK_FIELD[table]
        const hasBookFilter = table === 'pages' && bookId != null

        // rows ve count aynı transaction içinde al → tutarlı snapshot
        const getRows = db.prepare(
          hasBookFilter
            ? `SELECT * FROM ${table} WHERE book_id = ? ORDER BY ${pkField} ASC LIMIT ? OFFSET ?`
            : `SELECT * FROM ${table} ORDER BY ${pkField} ASC LIMIT ? OFFSET ?`
        )

        const getCount = db.prepare(
          hasBookFilter
            ? `SELECT COUNT(*) AS count FROM ${table} WHERE book_id = ?`
            : `SELECT COUNT(*) AS count FROM ${table}`
        )

        const result = db.transaction(() => {
          const rows = hasBookFilter
            ? getRows.all(bookId, limit, offset)
            : getRows.all(limit, offset)

          const { count } = hasBookFilter
            ? getCount.get(bookId)
            : getCount.get()

          return { rows, total: count }
        })()

        return { success: true, data: result }
      } catch (error) {
        return { success: false, error: error.message }
      }
    }
  )

  ipcMain.handle('dev:rawUpdate', (_event, { table, id, updates }) => {
    try {
      if (!ALLOWED_TABLES.has(table)) {
        throw new Error('Geçersiz tablo.')
      }

      const allowedFields = ALLOWED_FIELDS[table]
      const fields = Object.keys(updates).filter((f) => allowedFields.has(f))

      if (fields.length === 0) return { success: true }

      // Kolon adları whitelist'ten geldiği için SQL injection riski yok
      const setClause = fields.map((f) => `${f} = ?`).join(', ')
      const values = fields.map((f) => updates[f])
      const pkField = PK_FIELD[table]

      const query =
        table !== 'settings'
          ? `UPDATE ${table} SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE ${pkField} = ?`
          : `UPDATE ${table} SET ${setClause} WHERE ${pkField} = ?`

      db.prepare(query).run(...values, id)

      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })
}