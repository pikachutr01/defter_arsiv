import path from 'path'
import { dialog } from 'electron'
import { ensureStorageFolders, getDefaultStoragePath } from '../db.js'

const getSetting = (db, key) =>
  db.prepare('SELECT value FROM settings WHERE key = ?').get(key)?.value || null

const setSetting = (db, key, value) => {
  db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run(key, value)
}

const buildFallbackStoragePath = (app) =>
  getDefaultStoragePath({
    userDataRoot: path.join(app.getPath('userData'), 'cilt-dijital-kayit-sistemi'),
    documentsRoot: app.getPath('documents'),
  })

export const registerSettingsHandlers = ({ ipcMain, db, app }) => {
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
      const value = getSetting(db, 'storage_path') || buildFallbackStoragePath(app)
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

      ensureStorageFolders(storagePath)
      setSetting(db, 'storage_path', storagePath)
      return { success: true, data: storagePath }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('settings:chooseStoragePath', async () => {
    try {
      const currentPath =
        getSetting(db, 'storage_path') || buildFallbackStoragePath(app)

      const result = await dialog.showOpenDialog({
        title: 'Depolama klasörünü seçin',
        defaultPath: currentPath,
        properties: ['openDirectory', 'createDirectory'],
      })

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, canceled: true }
      }

      const selectedPath = result.filePaths[0]
      ensureStorageFolders(selectedPath)
      setSetting(db, 'storage_path', selectedPath)

      return { success: true, data: selectedPath }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })
}
