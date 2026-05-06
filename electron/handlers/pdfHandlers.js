import fs from 'fs'
import path from 'path'
import { shell } from 'electron'
import PDFDocument from 'pdfkit'
import sharp from 'sharp'

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


const resolvePdfFontPath = () => {
  const candidatesByPlatform = {
    win32: [
      'C:\\Windows\\Fonts\\segoeui.ttf',
      'C:\\Windows\\Fonts\\arial.ttf',
      'C:\\Windows\\Fonts\\calibri.ttf',
    ],
    darwin: [
      '/System/Library/Fonts/Supplemental/Arial Unicode.ttf',
      '/System/Library/Fonts/Supplemental/Arial.ttf',
    ],
    linux: [
      '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
      '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',
    ],
  }

  const candidates = candidatesByPlatform[process.platform] || []
  return candidates.find((candidate) => fs.existsSync(candidate)) || null
}

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

export const registerPdfHandlers = ({ ipcMain, db }) => {
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

      const doc = new PDFDocument({ autoFirstPage: false, margin: 20 })
      const pdfFontPath = resolvePdfFontPath()
      if (pdfFontPath) {
        doc.registerFont('ui', pdfFontPath)
        doc.font('ui')
      }
      const writeStream = fs.createWriteStream(finalPdfPath)
      doc.pipe(writeStream)

      for (let i = 0; i < selections.length; i++) {
        if (i > 0 && i % 50 === 0) {
          // Her 50 sayfada bir Garbage Collection'a ve ana döngüye nefes aldır.
          await new Promise((resolve) => setImmediate(resolve))
        }

        const item = selections[i]
        let imgSource = null
        if (item.annotatedDataUrl) {
          const base64Data = item.annotatedDataUrl.split(',')[1]
          if (base64Data) {
            imgSource = Buffer.from(base64Data, 'base64')
          }
        }

        if (!imgSource) {
          const absPath = resolveStoragePath(storagePath, item.imagePath)
          if (fs.existsSync(absPath)) {
            imgSource = absPath
          }
        }

        let isLandscape = false
        if (imgSource) {
          try {
            const metadata = await sharp(imgSource).metadata()
            let w = metadata.width
            let h = metadata.height
            if (metadata.orientation && metadata.orientation >= 5) {
              w = metadata.height
              h = metadata.width
            }
            if (w > h) isLandscape = true
          } catch (e) {
            // Ignore error, fallback to portrait
          }
        }

        const margin = 20
        doc.addPage({ 
          size: 'A4', 
          layout: isLandscape ? 'landscape' : 'portrait',
          margin: margin 
        })

        const A4_W = isLandscape ? 841.89 : 595.28
        const A4_H = isLandscape ? 595.28 : 841.89

        const PAGE_W = A4_W - (margin * 2)
        const PAGE_H = A4_H - (margin * 2)

        const NOTE_AREA = item.note?.trim() ? 40 : 0
        const IMG_MAX_H = PAGE_H - NOTE_AREA - 20

        if (imgSource) {
          doc.image(imgSource, margin, margin, {
            fit: [PAGE_W, IMG_MAX_H],
            align: 'center',
            valign: 'top',
          })
        }

        const labelY = margin + IMG_MAX_H + 5
        doc.fontSize(11).fillColor('#24324a')
        const bookLabel = item.bookName?.trim()
          ? `Cilt ${item.bookName}`
          : 'Cilt Adsız'
        doc.text(
          `${bookLabel} - Sayfa ${item.pageNumber}`,
          margin,
          labelY,
          { width: PAGE_W, align: 'center' }
        )

        if (item.note?.trim()) {
          doc.moveDown(0.3)
          doc.fontSize(10).fillColor('#4a5c78')
          doc.text(item.note.trim(), { width: PAGE_W, align: 'center' })
        }
      }

      doc.end()
      await waitForWriteStream(writeStream)

      return {
        success: true,
        data: {
          filePath: finalPdfPath,
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

  ipcMain.handle('pdf:revealInFolder', (_event, filePath) => {
    try {
      if (!filePath || !fs.existsSync(filePath)) {
        return { success: false, error: 'PDF bulunamadı.' }
      }

      shell.showItemInFolder(filePath)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('pdf:delete', (_event, filePath) => {
    try {
      if (!filePath || !fs.existsSync(filePath)) {
        return { success: false, error: 'PDF bulunamadı.' }
      }

      fs.rmSync(filePath, { force: true })
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })
}