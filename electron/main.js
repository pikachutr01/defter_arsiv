import { app, BrowserWindow, ipcMain, net, protocol } from 'electron'
import path from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import fs from 'fs'
import {
  ensureDefaults,
  ensureStorageFolders,
  getSetting,
  initDb,
} from './db.js'
import { registerAuthHandlers } from './handlers/authHandlers.js'
import { registerBookHandlers } from './handlers/bookHandlers.js'
import { registerPageHandlers } from './handlers/pageHandlers.js'
import { registerImageHandlers } from './handlers/imageHandlers.js'
import { registerPdfHandlers } from './handlers/pdfHandlers.js'
import { registerSearchHandlers } from './handlers/searchHandlers.js'
import { registerSettingsHandlers } from './handlers/settingsHandlers.js'
import { registerArchiveHandlers } from './handlers/archiveHandlers.js'
import { registerDeveloperHandlers } from './handlers/developerHandlers.js'
import { runPendingDeveloperReset } from './developerReset.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const isDev = !app.isPackaged

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'local-file',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
])

const registerLocalAssetProtocol = () => {
  protocol.handle('local-file', (request) => {
    const filePath = new URL(request.url).searchParams.get('path')

    if (!filePath) {
      return new Response('Missing file path.', { status: 400 })
    }

    return net.fetch(pathToFileURL(filePath).toString())
  })
}

const getIconPath = () => {
  if (isDev) {
    return path.join(__dirname, '..', 'assets', 'icon.ico')
  }
  return path.join(process.resourcesPath, 'assets', 'icon.ico')
}

const createMainWindow = () => {
  const win = new BrowserWindow({
    width: 1800,
    height: 1000,
    minWidth: 1024,
    minHeight: 600,
    title: 'Cilt Dijital Kayıt Sistemi',
    icon: getIconPath(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
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
  runPendingDeveloperReset(app.getPath('userData'))

  const userDataRoot = path.join(
    app.getPath('userData'),
    'cilt-dijital-kayit-sistemi'
  )
  fs.mkdirSync(userDataRoot, { recursive: true })

  const dbPath = path.join(userDataRoot, 'database.sqlite')
  const db = initDb(dbPath)

  ensureDefaults({
    userDataRoot,
    documentsRoot: app.getPath('documents'),
  })
  const storagePath = getSetting('storage_path')
  if (storagePath) {
    ensureStorageFolders(storagePath)
  }

  registerAuthHandlers({ ipcMain, db })
  registerBookHandlers({ ipcMain, db })
  registerPageHandlers({ ipcMain, db })
  registerImageHandlers({ ipcMain, db })
  registerPdfHandlers({ ipcMain, db, app })
  registerSearchHandlers({ ipcMain, db })
  registerSettingsHandlers({ ipcMain, db, app })
  registerArchiveHandlers({ ipcMain, db })
  registerDeveloperHandlers({ ipcMain, db })
}

app.whenReady().then(() => {
  registerLocalAssetProtocol()
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
