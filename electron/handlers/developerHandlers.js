export const registerDeveloperHandlers = ({ ipcMain, db }) => {
  ipcMain.handle('dev:getTableData', (_event, { table, limit = 50, offset = 0, bookId = null }) => {
    try {
      if (!['books', 'pages', 'settings'].includes(table)) {
        throw new Error('Geçersiz tablo.')
      }

      let query = `SELECT * FROM ${table}`
      const params = []

      if (table === 'pages' && bookId) {
        query += ` WHERE book_id = ?`
        params.push(bookId)
      }

      const pkField = table === 'settings' ? 'key' : 'id'
      query += ` ORDER BY ${pkField} ASC LIMIT ? OFFSET ?`
      params.push(limit, offset)

      const rows = db.prepare(query).all(...params)

      let countQuery = `SELECT COUNT(*) as count FROM ${table}`
      const countParams = []
      if (table === 'pages' && bookId) {
        countQuery += ` WHERE book_id = ?`
        countParams.push(bookId)
      }

      const { count } = db.prepare(countQuery).get(...countParams)

      return { success: true, data: { rows, total: count } }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('dev:rawUpdate', (_event, { table, id, updates }) => {
    try {
      if (!['books', 'pages', 'settings'].includes(table)) {
        throw new Error('Geçersiz tablo.')
      }
      
      const pkField = table === 'settings' ? 'key' : 'id'
      
      const fields = Object.keys(updates)
      if (fields.length === 0) return { success: true }
      
      const setClause = fields.map(f => `${f} = ?`).join(', ')
      const values = fields.map(f => updates[f])
      
      let query = `UPDATE ${table} SET ${setClause}`
      
      // Sadece updated_at kolonu olan tablolarda (settings hariç) tarihi güncelle
      if (table !== 'settings') {
        query += `, updated_at = CURRENT_TIMESTAMP`
      }
      
      query += ` WHERE ${pkField} = ?`
      db.prepare(query).run(...values, id)
      
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })
}
