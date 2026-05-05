const { contextBridge, ipcRenderer, webUtils } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  auth: {
    login: (credentials) => ipcRenderer.invoke('auth:login', credentials),
    changeCredentials: (payload) =>
      ipcRenderer.invoke('auth:changeCredentials', payload),
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
  },
  search: {
    query: (text, bookId) => ipcRenderer.invoke('search:query', text, bookId),
  },
  pdf: {
    generate: (payload) => ipcRenderer.invoke('pdf:generate', payload),
    list: () => ipcRenderer.invoke('pdf:list'),
    open: (filePath) => ipcRenderer.invoke('pdf:open', filePath),
  },
  settings: {
    get: (key) => ipcRenderer.invoke('settings:get', key),
    set: (key, value) => ipcRenderer.invoke('settings:set', key, value),
    getStoragePath: () => ipcRenderer.invoke('settings:getStoragePath'),
    setStoragePath: (value) =>
      ipcRenderer.invoke('settings:setStoragePath', value),
    chooseStoragePath: () => ipcRenderer.invoke('settings:chooseStoragePath'),
  },
  archive: {
    exportFull: () => ipcRenderer.invoke('archive:exportFull'),
    importFull: () => ipcRenderer.invoke('archive:importFull'),
  },
  system: {
    getPathForFile: (file) => webUtils.getPathForFile(file),
  },
})
