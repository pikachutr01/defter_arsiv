import fs from 'fs'
import path from 'path'
import { app, dialog } from 'electron'
import archiver from 'archiver'
import unzipper from 'unzipper'

const getStoragePath = (db) =>
  db.prepare('SELECT value FROM settings WHERE key = ?').get('storage_path')
    ?.value || null

const ensureDir = (targetPath) => fs.mkdirSync(targetPath, { recursive: true })

const getAppDataPath = () =>
  path.join(app.getPath('userData'), 'cilt-dijital-kayit-sistemi')

const copyRecursive = (src, dest) => {
  if (!fs.existsSync(src)) return
  const stat = fs.statSync(src)
  if (stat.isDirectory()) {
    ensureDir(dest)
    fs.readdirSync(src).forEach((entry) => {
      copyRecursive(path.join(src, entry), path.join(dest, entry))
    })
  } else {
    ensureDir(path.dirname(dest))
    fs.copyFileSync(src, dest)
  }
}

const removeIfExists = (targetPath) => {
  if (fs.existsSync(targetPath)) {
    fs.rmSync(targetPath, { recursive: true, force: true })
  }
}

export const registerArchiveHandlers = ({ ipcMain, db }) => {
  ipcMain.handle('archive:exportFull', async () => {
    try {
      const saveResult = await dialog.showSaveDialog({
        title: 'Tam Arşiv Dışarı Aktar',
        defaultPath: `cilt-dijital-kayit-sistemi-backup-${new Date().toISOString().slice(0, 10)}.zip`,
        filters: [{ name: 'ZIP', extensions: ['zip'] }],
      })

      if (saveResult.canceled || !saveResult.filePath) {
        return { success: false, error: 'Kayıt iptal edildi.' }
      }

      const storagePath = getStoragePath(db)
      if (!storagePath) {
        return { success: false, error: 'Depolama yolu tanımlı değil.' }
      }

      const dataPath = getAppDataPath()
      const dbPath = path.join(dataPath, 'database.sqlite')

      const bookCount = db.prepare('SELECT COUNT(*) AS count FROM books').get().count
      const pageCount = db.prepare('SELECT COUNT(*) AS count FROM pages').get().count
      const imageCount = db
        .prepare(
          'SELECT COUNT(*) AS count FROM pages WHERE is_uploaded = 1'
        )
        .get().count

      const manifest = {
        version: '1.0',
        exported_at: new Date().toISOString(),
        book_count: bookCount,
        page_count: pageCount,
        image_count: imageCount,
      }

      const output = fs.createWriteStream(saveResult.filePath)
      const archive = archiver('zip', { zlib: { level: 9 } })

      archive.pipe(output)
      archive.append(JSON.stringify(manifest, null, 2), { name: 'manifest.json' })
      if (fs.existsSync(dbPath)) {
        archive.file(dbPath, { name: 'database.sqlite' })
      }
      if (fs.existsSync(storagePath)) {
        archive.directory(storagePath, 'images')
      }

      await archive.finalize()
      return { success: true, data: { filePath: saveResult.filePath } }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('archive:importFull', async () => {
    let backupPath = null
    let storagePath = null
    let currentDbPath = null
    let backupReady = false
    let replacedDb = false
    let replacedImages = false

    try {
      const openResult = await dialog.showOpenDialog({
        title: 'Arşiv İçe Aktar',
        properties: ['openFile'],
        filters: [{ name: 'ZIP', extensions: ['zip'] }],
      })

      if (openResult.canceled || openResult.filePaths.length === 0) {
        return { success: false, error: 'Seçim iptal edildi.' }
      }

      const zipPath = openResult.filePaths[0]
      const dataPath = getAppDataPath()
      storagePath = getStoragePath(db)
      if (!storagePath) {
        return { success: false, error: 'Depolama yolu tanımlı değil.' }
      }

      backupPath = path.join(dataPath, `backup-${Date.now()}`)
      ensureDir(backupPath)

      currentDbPath = path.join(dataPath, 'database.sqlite')
      if (fs.existsSync(currentDbPath)) {
        copyRecursive(currentDbPath, path.join(backupPath, 'database.sqlite'))
      }
      if (fs.existsSync(storagePath)) {
        copyRecursive(storagePath, path.join(backupPath, 'images'))
      }
      backupReady = true

      const tempDir = fs.mkdtempSync(path.join(dataPath, 'import-'))
      await fs
        .createReadStream(zipPath)
        .pipe(unzipper.Extract({ path: tempDir }))
        .promise()

      const importedDb = path.join(tempDir, 'database.sqlite')
      const importedImages = path.join(tempDir, 'images')

      if (!fs.existsSync(importedDb)) {
        removeIfExists(tempDir)
        return { success: false, error: 'Arşivde veritabanı bulunamadı.' }
      }

      copyRecursive(importedDb, currentDbPath)
      replacedDb = true

      if (fs.existsSync(importedImages)) {
        removeIfExists(storagePath)
        copyRecursive(importedImages, storagePath)
        replacedImages = true
      }

      removeIfExists(tempDir)
      if (backupPath) {
        removeIfExists(backupPath)
      }
      setTimeout(() => {
        app.relaunch()
        app.exit(0)
      }, 150)
      return { success: true }
    } catch (error) {
      if (backupReady && backupPath) {
        const backupDbPath = path.join(backupPath, 'database.sqlite')
        const backupImagesPath = path.join(backupPath, 'images')

        if (replacedDb && fs.existsSync(backupDbPath)) {
          copyRecursive(backupDbPath, currentDbPath)
        }

        if (replacedImages && fs.existsSync(backupImagesPath) && storagePath) {
          removeIfExists(storagePath)
          copyRecursive(backupImagesPath, storagePath)
        }
      }
      return { success: false, error: error.message }
    }
  })
}
