import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import { ensureDefaults, ensureStorageFolders, getSetting, initDb } from './db.js'
import { registerAuthHandlers } from './handlers/authHandlers.js'
import { registerBookHandlers } from './handlers/bookHandlers.js'
import { registerPageHandlers } from './handlers/pageHandlers.js'
import { registerImageHandlers } from './handlers/imageHandlers.js'
import { registerPdfHandlers } from './handlers/pdfHandlers.js'
import { registerSearchHandlers } from './handlers/searchHandlers.js'
import { registerSettingsHandlers } from './handlers/settingsHandlers.js'
import { registerArchiveHandlers } from './handlers/archiveHandlers.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const isDev = !app.isPackaged

const createMainWindow = () => {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    title: 'Cilt Dijital Kayıt Sistemi',
    titleBarStyle: 'hidden',
    titleBarOverlay: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  if (isDev) {
    win.loadURL('http://localhost:5173')
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }
}

const setupApp = () => {
  const userDataRoot = path.join(
    app.getPath('userData'),
    'cilt-dijital-kayit-sistemi'
  )
  fs.mkdirSync(userDataRoot, { recursive: true })

  const dbPath = path.join(userDataRoot, 'database.sqlite')
  const db = initDb(dbPath)

  ensureDefaults(userDataRoot)
  const storagePath = getSetting('storage_path')
  if (storagePath) {
    ensureStorageFolders(storagePath)
  }

  registerAuthHandlers({ ipcMain, db })
  registerBookHandlers({ ipcMain, db })
  registerPageHandlers({ ipcMain, db })
  registerImageHandlers({ ipcMain, db })
  registerPdfHandlers({ ipcMain, db })
  registerSearchHandlers({ ipcMain, db })
  registerSettingsHandlers({ ipcMain, db })
  registerArchiveHandlers({ ipcMain, db })
}

app.whenReady().then(() => {
  setupApp()
  createMainWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
