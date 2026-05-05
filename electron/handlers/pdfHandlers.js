import fs from 'fs'
import path from 'path'
import { shell } from 'electron'
import PDFDocument from 'pdfkit'

const getStoragePath = (db) =>
  db.prepare('SELECT value FROM settings WHERE key = ?').get('storage_path')
    ?.value || null

const resolveStoragePath = (storagePath, targetPath) =>
  path.isAbsolute(targetPath) ? targetPath : path.join(storagePath, targetPath)

const ensurePdfFolder = (storagePath) => {
  const pdfDir = path.join(storagePath, 'pdfs')
  fs.mkdirSync(pdfDir, { recursive: true })
  return pdfDir
}

const sanitizeFileName = (value) =>
  String(value || 'cilt-dijital-kayit-sistemi')
    .replace(/[<>:"/\\|?*]/g, '')
    .trim()

const buildUniqueFilePath = (directoryPath, fileName) => {
  const safeBaseName =
    sanitizeFileName(path.parse(fileName).name) || 'cilt-dijital-kayit-sistemi'

  let attempt = 0
  let candidateName = `${safeBaseName}.pdf`
  let candidatePath = path.join(directoryPath, candidateName)

  while (fs.existsSync(candidatePath)) {
    attempt += 1
    candidateName = `${safeBaseName} (${attempt}).pdf`
    candidatePath = path.join(directoryPath, candidateName)
  }

  return candidatePath
}

const waitForWriteStream = (stream) =>
  new Promise((resolve, reject) => {
    stream.on('finish', resolve)
    stream.on('error', reject)
  })

export const registerPdfHandlers = ({ ipcMain, db, app }) => {
  ipcMain.handle('pdf:generate', async (_event, payload) => {
    let finalPdfPath = null

    try {
      const selections = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.selections)
          ? payload.selections
          : []

      if (selections.length === 0) {
        return { success: false, error: 'Seçim yapılmadı.' }
      }

      const storagePath = getStoragePath(db)
      if (!storagePath) {
        return { success: false, error: 'Depolama yolu tanımlı değil.' }
      }

      const pdfDir = ensurePdfFolder(storagePath)
      const requestedName = sanitizeFileName(
        Array.isArray(payload)
          ? 'cilt-dijital-kayit-sistemi'
          : payload?.fileName || 'cilt-dijital-kayit-sistemi'
      )

      finalPdfPath = buildUniqueFilePath(pdfDir, requestedName)
      const finalFileName = path.basename(finalPdfPath)

      const doc = new PDFDocument({ autoFirstPage: false, margin: 40 })
      const writeStream = fs.createWriteStream(finalPdfPath)
      doc.pipe(writeStream)

      selections.forEach((item) => {
        doc.addPage({ size: 'A4', margin: 40 })

        const absPath = resolveStoragePath(storagePath, item.imagePath)
        if (fs.existsSync(absPath)) {
          doc.image(absPath, {
            fit: [520, 650],
            align: 'center',
            valign: 'center',
          })
        }

        doc.moveDown(1)
        doc.fontSize(12).fillColor('#24324a')
        doc.text(`${item.bookName} - Sayfa ${item.pageNumber} - ${item.side} Yüzü`, {
          align: 'center',
        })

        if (item.note?.trim()) {
          doc.moveDown(0.7)
          doc.fontSize(11).fillColor('#4a5c78')
          doc.text(item.note.trim(), {
            align: 'center',
            width: 500,
          })
        }
      })

      doc.end()
      await waitForWriteStream(writeStream)

      const downloadsPath = app.getPath('downloads')
      fs.mkdirSync(downloadsPath, { recursive: true })
      const downloadCopyPath = buildUniqueFilePath(downloadsPath, finalFileName)
      fs.copyFileSync(finalPdfPath, downloadCopyPath)

      return {
        success: true,
        data: {
          filePath: finalPdfPath,
          downloadPath: downloadCopyPath,
          fileName: finalFileName,
        },
      }
    } catch (error) {
      if (finalPdfPath && fs.existsSync(finalPdfPath)) {
        fs.rmSync(finalPdfPath, { force: true })
      }

      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('pdf:list', () => {
    try {
      const storagePath = getStoragePath(db)
      if (!storagePath) {
        return { success: false, error: 'Depolama yolu tanımlı değil.' }
      }

      const pdfDir = ensurePdfFolder(storagePath)
      const items = fs
        .readdirSync(pdfDir, { withFileTypes: true })
        .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.pdf'))
        .map((entry) => {
          const fullPath = path.join(pdfDir, entry.name)
          const stat = fs.statSync(fullPath)

          return {
            id: fullPath,
            name: entry.name,
            filePath: fullPath,
            createdAt: stat.birthtimeMs,
            updatedAt: stat.mtimeMs,
            size: stat.size,
          }
        })
        .sort((left, right) => right.updatedAt - left.updatedAt)

      return { success: true, data: items }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('pdf:open', async (_event, filePath) => {
    try {
      if (!filePath || !fs.existsSync(filePath)) {
        return { success: false, error: 'PDF bulunamadı.' }
      }

      const result = await shell.openPath(filePath)
      if (result) {
        return { success: false, error: result }
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })
}
