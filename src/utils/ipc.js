const getApi = () => {
  if (!window?.electronAPI) {
    throw new Error('Electron API kullanılamıyor. Uygulamayı Electron penceresinde açın.')
  }
  return window.electronAPI
}

export const ipc = {
  authLogin: (credentials) => getApi().auth.login(credentials),
  authChange: (payload) => getApi().auth.changeCredentials(payload),
  booksGetAll: () => getApi().books.getAll(),
  booksGetById: (id) => getApi().books.getById(id),
  booksChooseCover: () => getApi().books.chooseCover(),
  booksCreate: (data) => getApi().books.create(data),
  booksUpdate: (id, data) => getApi().books.update(id, data),
  booksDelete: (id) => getApi().books.delete(id),
  booksSetCover: (id, imagePath) => getApi().books.setCover(id, imagePath),
  pagesGetByBook: (bookId) => getApi().pages.getByBook(bookId),
  pagesGetById: (id) => getApi().pages.getById(id),
  pagesCreate: (data) => getApi().pages.create(data),
  pagesBulkCreate: (bookId, count) => getApi().pages.bulkCreate(bookId, count),
  pagesUpdate: (id, data) => getApi().pages.update(id, data),
  pagesDelete: (id) => getApi().pages.delete(id),
  imagesUpload: (pageId, side, sourcePath) =>
    getApi().images.upload(pageId, side, sourcePath),
  imagesUploadFromDialog: (pageId, side) =>
    getApi().images.uploadFromDialog(pageId, side),
  imagesDelete: (pageId, side) => getApi().images.delete(pageId, side),
  imagesRevealInFolder: (imagePath) => getApi().images.revealInFolder(imagePath),
  imagesExport: (imagePaths, destFolder) =>
    getApi().images.export(imagePaths, destFolder),
  imagesGetThumbnail: (imagePath) => getApi().images.getThumbnail(imagePath),
  searchQuery: (text, bookId) => getApi().search.query(text, bookId),
  pdfGenerate: (selections) => getApi().pdf.generate(selections),
  settingsGet: (key) => getApi().settings.get(key),
  settingsSet: (key, value) => getApi().settings.set(key, value),
  settingsGetStoragePath: () => getApi().settings.getStoragePath(),
  settingsSetStoragePath: (value) => getApi().settings.setStoragePath(value),
  settingsChooseStoragePath: () => getApi().settings.chooseStoragePath(),
  archiveExport: () => getApi().archive.exportFull(),
  archiveImport: () => getApi().archive.importFull(),
  systemGetPathForFile: (file) => getApi().system.getPathForFile(file),
}
