import fs from 'fs'
import path from 'path'
import { dialog } from 'electron'
import PDFDocument from 'pdfkit'

const getStoragePath = (db) =>
  db.prepare('SELECT value FROM settings WHERE key = ?').get('storage_path')
    ?.value || null

const resolveStoragePath = (storagePath, targetPath) =>
  path.isAbsolute(targetPath) ? targetPath : path.join(storagePath, targetPath)

export const registerPdfHandlers = ({ ipcMain, db }) => {
  ipcMain.handle('pdf:generate', async (_event, selections) => {
    try {
      if (!selections || selections.length === 0) {
        return { success: false, error: 'Seçim yapılmadı.' }
      }

      const saveResult = await dialog.showSaveDialog({
        title: 'PDF Kaydet',
        defaultPath: 'cilt-dijital-kayit-sistemi.pdf',
        filters: [{ name: 'PDF', extensions: ['pdf'] }],
      })

      if (saveResult.canceled || !saveResult.filePath) {
        return { success: false, error: 'Kayıt iptal edildi.' }
      }

      const storagePath = getStoragePath(db)
      if (!storagePath) {
        return { success: false, error: 'Depolama yolu tanımlı değil.' }
      }

      const doc = new PDFDocument({ autoFirstPage: false })
      doc.pipe(fs.createWriteStream(saveResult.filePath))

      selections.forEach((item) => {
        doc.addPage({ size: 'A4', margin: 40 })
        const absPath = resolveStoragePath(storagePath, item.imagePath)
        if (fs.existsSync(absPath)) {
          doc.image(absPath, {
            fit: [520, 680],
            align: 'center',
            valign: 'center',
          })
        }
        doc.moveDown(1)
        doc.fontSize(12).fillColor('#24324a')
        doc.text(`${item.bookName} — Sayfa ${item.pageNumber} — ${item.side} Yüzü`, {
          align: 'center',
        })
      })

      doc.end()
      return { success: true, data: { filePath: saveResult.filePath } }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })
}
