import fs from 'fs'

const getSetting = (db, key) =>
  db.prepare('SELECT value FROM settings WHERE key = ?').get(key)?.value || null

const setSetting = (db, key, value) => {
  db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run(key, value)
}

export const registerSettingsHandlers = ({ ipcMain, db }) => {
  ipcMain.handle('settings:get', (_event, key) => {
    try {
      const value = getSetting(db, key)
      return { success: true, data: value }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('settings:set', (_event, key, value) => {
    try {
      setSetting(db, key, value)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('settings:getStoragePath', () => {
    try {
      const value = getSetting(db, 'storage_path')
      return { success: true, data: value }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('settings:setStoragePath', (_event, storagePath) => {
    try {
      if (!storagePath) {
        return { success: false, error: 'Geçersiz yol.' }
      }
      fs.mkdirSync(storagePath, { recursive: true })
      setSetting(db, 'storage_path', storagePath)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })
}
