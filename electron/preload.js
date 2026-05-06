import { contextBridge, ipcRenderer, webUtils } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  auth: {
    login: (credentials) => ipcRenderer.invoke('auth:login', credentials),
    changeCredentials: (payload) =>
      ipcRenderer.invoke('auth:changeCredentials', payload),
    resetWithToken: (payload) => ipcRenderer.invoke('auth:resetWithToken', payload),
  },
  books: {
    getAll: () => ipcRenderer.invoke('books:getAll'),
    getById: (id) => ipcRenderer.invoke('books:getById', id),
    chooseCover: () => ipcRenderer.invoke('books:chooseCover'),
    create: (data) => ipcRenderer.invoke('books:create', data),
    update: (id, data) => ipcRenderer.invoke('books:update', id, data),
    delete: (id) => ipcRenderer.invoke('books:delete', id),
    setCover: (id, imagePath) =>
      ipcRenderer.invoke('books:setCover', id, imagePath),
  },
  pages: {
    getByBook: (bookId) => ipcRenderer.invoke('pages:getByBook', bookId),
    getById: (id) => ipcRenderer.invoke('pages:getById', id),
    create: (data) => ipcRenderer.invoke('pages:create', data),
    bulkCreate: (bookId, count) =>
      ipcRenderer.invoke('pages:bulkCreate', bookId, count),
    update: (id, data) => ipcRenderer.invoke('pages:update', id, data),
    delete: (id) => ipcRenderer.invoke('pages:delete', id),
  },
  images: {
    upload: (pageId, side, sourcePath) =>
      ipcRenderer.invoke('images:upload', pageId, side, sourcePath),
    uploadFromDialog: (pageId, side) =>
      ipcRenderer.invoke('images:uploadFromDialog', pageId, side),
    delete: (pageId, side) =>
      ipcRenderer.invoke('images:delete', pageId, side),
    revealInFolder: (imagePath) =>
      ipcRenderer.invoke('images:revealInFolder', imagePath),
    export: (imagePaths, destFolder) =>
      ipcRenderer.invoke('images:export', imagePaths, destFolder),
    getThumbnail: (imagePath) =>
      ipcRenderer.invoke('images:getThumbnail', imagePath),
    rotate: (pageId) =>
      ipcRenderer.invoke('images:rotate', pageId),
  },
  search: {
    query: (text, bookId) => ipcRenderer.invoke('search:query', text, bookId),
  },
  pdf: {
    generate: (payload) => ipcRenderer.invoke('pdf:generate', payload),
    list: () => ipcRenderer.invoke('pdf:list'),
    open: (filePath) => ipcRenderer.invoke('pdf:open', filePath),
    revealInFolder: (filePath) => ipcRenderer.invoke('pdf:revealInFolder', filePath),
    delete: (filePath) => ipcRenderer.invoke('pdf:delete', filePath),
  },
  settings: {
    get: (key) => ipcRenderer.invoke('settings:get', key),
    set: (key, value) => ipcRenderer.invoke('settings:set', key, value),
    getStoragePath: () => ipcRenderer.invoke('settings:getStoragePath'),
    setStoragePath: (value) =>
      ipcRenderer.invoke('settings:setStoragePath', value),
    chooseStoragePath: () => ipcRenderer.invoke('settings:chooseStoragePath'),
    verifyStoragePath: () => ipcRenderer.invoke('settings:verifyStoragePath'),
    scanStorageIntegrity: (payload) =>
      ipcRenderer.invoke('settings:scanStorageIntegrity', payload),
    deleteOrphanFiles: (payload) =>
      ipcRenderer.invoke('settings:deleteOrphanFiles', payload),
    clearMissingRefs: (payload) =>
      ipcRenderer.invoke('settings:clearMissingRefs', payload),
  },
  archive: {
    exportFull: () => ipcRenderer.invoke('archive:exportFull'),
    importFull: () => ipcRenderer.invoke('archive:importFull'),
  },
  system: {
    getPathForFile: (file) => webUtils.getPathForFile(file),
  },
})