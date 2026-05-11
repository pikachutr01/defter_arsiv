const getApi = () => {
  if (!window?.electronAPI) {
    throw new Error('Electron API kullanılamıyor. Uygulamayı Electron penceresinde açın.')
  }
  return window.electronAPI
}

export const ipc = {
  authLogin: (credentials) => getApi().auth.login(credentials),
  authChange: (payload) => getApi().auth.changeCredentials(payload),
  authResetWithToken: (payload) => getApi().auth.resetWithToken(payload),
  authAuthorizeDeveloperReset: (payload) =>
    getApi().auth.authorizeDeveloperReset(payload),
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
  imagesRotate: (pageId) => getApi().images.rotate(pageId),
  imagesBulkUpload: (bookId, sortMethod) => getApi().images.bulkUpload(bookId, sortMethod),
  imagesSelectFromDialog: () => getApi().images.selectFromDialog(),
  imagesCopyToDesktop: (payload) => getApi().images.copyToDesktop(payload),
  imagesOpenFile: (filePath) => getApi().images.openFile(filePath),
  imagesPrint: (imagePath) => getApi().images.print(imagePath),
  onImagesBulkUploadProgress: (callback) => getApi().images.onBulkUploadProgress(callback),
  searchQuery: (payload) => getApi().search.query(payload),
  pdfGenerate: (payload) => getApi().pdf.generate(payload),
  pdfList: () => getApi().pdf.list(),
  pdfOpen: (filePath) => getApi().pdf.open(filePath),
  pdfRevealInFolder: (filePath) => getApi().pdf.revealInFolder(filePath),
  pdfDelete: (filePath) => getApi().pdf.delete(filePath),
  pdfPrint: (filePath) => getApi().pdf.print(filePath),
  settingsGet: (key) => getApi().settings.get(key),
  settingsSet: (key, value) => getApi().settings.set(key, value),
  settingsGetStoragePath: () => getApi().settings.getStoragePath(),
  settingsVerifyStoragePath: () => getApi().settings.verifyStoragePath(),
  settingsGetDeveloperResetContext: () =>
    getApi().settings.getDeveloperResetContext(),
  settingsScheduleDeveloperReset: (payload) =>
    getApi().settings.scheduleDeveloperReset(payload),
  settingsSetStoragePath: (value) => getApi().settings.setStoragePath(value),
  settingsChooseStoragePath: () => getApi().settings.chooseStoragePath(),
  settingsScanStorageIntegrity: (payload) =>
    getApi().settings.scanStorageIntegrity(payload),
  settingsDeleteOrphanFiles: (payload) => getApi().settings.deleteOrphanFiles(payload),
  settingsClearMissingRefs: (payload) => getApi().settings.clearMissingRefs(payload),
  settingsGetStorageStats: () => getApi().settings.getStorageStats(),
  archiveExport: () => getApi().archive.exportFull(),
  archiveImport: () => getApi().archive.importFull(),
  systemGetPathForFile: (file) => getApi().system.getPathForFile(file),
  devGetTableData: (payload) => getApi().dev.getTableData(payload),
  devRawUpdate: (payload) => getApi().dev.rawUpdate(payload),
}
