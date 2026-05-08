import fs from 'fs'
import path from 'path'
import { shell } from 'electron'
import PDFDocument from 'pdfkit'
import sharp from 'sharp'

// ─── Yardımcı: Ayarlardan depolama yolunu al ────────────────────────────────

const getStoragePath = (db) =>
  db.prepare('SELECT value FROM settings WHERE key = ?').get('storage_path')
    ?.value ?? null

// ─── Yardımcı: Mutlak / göreli yol çözümle ──────────────────────────────────

const resolveStoragePath = (storagePath, targetPath) =>
  path.isAbsolute(targetPath) ? targetPath : path.join(storagePath, targetPath)

// ─── Yardımcı: PDF klasörünü garantiye al ───────────────────────────────────

const ensurePdfFolder = (storagePath) => {
  const pdfDir = path.join(storagePath, 'pdfs')
  fs.mkdirSync(pdfDir, { recursive: true })
  return pdfDir
}

// ─── Yardımcı: Dosya adını güvenli hale getir ───────────────────────────────

const DEFAULT_FILE_NAME = 'cilt-dijital-kayit-sistemi'

const sanitizeFileName = (value) =>
  String(value || DEFAULT_FILE_NAME)
    .replace(/[<>:"/\\|?*]/g, '')
    .trim() || DEFAULT_FILE_NAME

// ─── Yardımcı: Sistem fontunu bul (memoize edilmiş) ─────────────────────────

const FONT_CANDIDATES = {
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

let _cachedFontPath = undefined // undefined = henüz kontrol edilmedi, null = bulunamadı

const resolvePdfFontPath = () => {
  if (_cachedFontPath !== undefined) return _cachedFontPath
  const candidates = FONT_CANDIDATES[process.platform] ?? []
  _cachedFontPath = candidates.find((c) => fs.existsSync(c)) ?? null
  return _cachedFontPath
}

// ─── Yardımcı: Çakışmayan benzersiz dosya yolu oluştur ──────────────────────

const buildUniqueFilePath = (directoryPath, fileName) => {
  const baseName = sanitizeFileName(path.parse(fileName).name)
  const existing = new Set(fs.readdirSync(directoryPath))

  let candidateName = `${baseName}.pdf`
  let attempt = 0

  while (existing.has(candidateName)) {
    attempt += 1
    candidateName = `${baseName} (${attempt}).pdf`
  }

  return path.join(directoryPath, candidateName)
}

// ─── Yardımcı: WriteStream'in bitmesini bekle ───────────────────────────────

const waitForWriteStream = (stream) =>
  new Promise((resolve, reject) => {
    stream.once('finish', resolve)
    stream.once('error', reject)
  })

// ─── Yardımcı: Görselin yatay mı dikey mi olduğunu belirle ─────────────────

const resolveImageOrientation = async (imgSource) => {
  try {
    const metadata = await sharp(imgSource).metadata()
    let w = metadata.width ?? 0
    let h = metadata.height ?? 0

    // EXIF orientation >= 5 ise genişlik ve yükseklik yer değiştirir
    if (metadata.orientation >= 5) {
      ;[w, h] = [h, w]
    }

    return w > h ? 'landscape' : 'portrait'
  } catch {
    return 'portrait' // hata durumunda dikey kabul et
  }
}

// ─── Yardımcı: Base64 veri URL'ini Buffer'a çevir ───────────────────────────

const dataUrlToBuffer = (dataUrl) => {
  const base64 = dataUrl.split(',')[1]
  return base64 ? Buffer.from(base64, 'base64') : null
}

// ─── IPC Handler Kayıt Fonksiyonu ───────────────────────────────────────────

export const registerPdfHandlers = ({ ipcMain, db }) => {

  // ── PDF Oluştur ────────────────────────────────────────────────────────────
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
        Array.isArray(payload) ? DEFAULT_FILE_NAME : (payload?.fileName ?? DEFAULT_FILE_NAME)
      )

      finalPdfPath = buildUniqueFilePath(pdfDir, requestedName)
      const finalFileName = path.basename(finalPdfPath)

      // PDFKit dokümanını hazırla
      const doc = new PDFDocument({ autoFirstPage: false, margin: 15 })

      const pdfFontPath = resolvePdfFontPath()
      if (pdfFontPath) {
        doc.registerFont('ui', pdfFontPath)
        doc.font('ui')
      }

      const writeStream = fs.createWriteStream(finalPdfPath, { encoding: null })
      doc.pipe(writeStream)

      const MARGIN = 15

      for (let i = 0; i < selections.length; i++) {
        // Her 50 sayfada bir olay döngüsüne nefes aldır (GC & UI yanıt verme)
        if (i > 0 && i % 50 === 0) {
          await new Promise((resolve) => setImmediate(resolve))
        }

        const item = selections[i]

        // Görsel kaynağını belirle: önce annotated base64, sonra disk yolu
        let imgSource =
          item.annotatedDataUrl ? dataUrlToBuffer(item.annotatedDataUrl) : null

        if (!imgSource) {
          const absPath = resolveStoragePath(storagePath, item.imagePath)
          if (fs.existsSync(absPath)) imgSource = absPath
        }

        // Sayfa yönünü belirle
        const layout = imgSource
          ? await resolveImageOrientation(imgSource)
          : 'portrait'

        const isLandscape = layout === 'landscape'

        // A4 boyutları (puan cinsinden)
        const A4_W = isLandscape ? 841.89 : 595.28
        const A4_H = isLandscape ? 595.28 : 841.89
        const PAGE_W = A4_W - MARGIN * 2
        const PAGE_H = A4_H - MARGIN * 2

        const hasNote = Boolean(item.note?.trim())
        const NOTE_AREA = hasNote ? 40 : 0
        const IMG_MAX_H = PAGE_H - NOTE_AREA - 20

        doc.addPage({ size: 'A4', layout, margin: MARGIN })

        // Görseli yerleştir
        if (imgSource) {
          doc.image(imgSource, MARGIN, MARGIN, {
            fit: [PAGE_W, IMG_MAX_H],
            align: 'center',
            valign: 'top',
          })
        }

        // Sayfa etiketi
        const bookLabel = item.bookName?.trim()
          ? `Cilt ${item.bookName}`
          : 'Cilt Adsız'

        const labelY = MARGIN + IMG_MAX_H + 5

        doc
          .fontSize(11)
          .fillColor('#24324a')
          .text(`${bookLabel} - Sayfa ${item.pageNumber}`, MARGIN, labelY, {
            width: PAGE_W,
            align: 'center',
          })

        // Not alanı
        if (hasNote) {
          doc
            .moveDown(0.3)
            .fontSize(10)
            .fillColor('#4a5c78')
            .text(item.note.trim(), { width: PAGE_W, align: 'center' })
        }
      }

      doc.end()
      await waitForWriteStream(writeStream)

      return {
        success: true,
        data: { filePath: finalPdfPath, fileName: finalFileName },
      }
    } catch (error) {
      // Hatalı / yarım kalan dosyayı temizle
      if (finalPdfPath) {
        try { fs.rmSync(finalPdfPath, { force: true }) } catch { /* yoksay */ }
      }

      return { success: false, error: error.message }
    }
  })

  // ── PDF Listele ────────────────────────────────────────────────────────────
  ipcMain.handle('pdf:list', () => {
    try {
      const storagePath = getStoragePath(db)
      if (!storagePath) {
        return { success: false, error: 'Depolama yolu tanımlı değil.' }
      }

      const pdfDir = ensurePdfFolder(storagePath)

      // withFileTypes + tek stat çağrısı ile hem dosya kontrolü hem stat bilgisi
      const items = fs
        .readdirSync(pdfDir, { withFileTypes: true })
        .filter((e) => e.isFile() && e.name.toLowerCase().endsWith('.pdf'))
        .map((e) => {
          const fullPath = path.join(pdfDir, e.name)
          const { birthtimeMs, mtimeMs, size } = fs.statSync(fullPath)
          return {
            id: fullPath,
            name: e.name,
            filePath: fullPath,
            createdAt: birthtimeMs,
            updatedAt: mtimeMs,
            size,
          }
        })
        .sort((a, b) => b.updatedAt - a.updatedAt)

      return { success: true, data: items }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  // ── PDF Aç ─────────────────────────────────────────────────────────────────
  ipcMain.handle('pdf:open', async (_event, filePath) => {
    try {
      if (!filePath || !fs.existsSync(filePath)) {
        return { success: false, error: 'PDF bulunamadı.' }
      }

      const result = await shell.openPath(filePath)
      return result ? { success: false, error: result } : { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  // ── Klasörde Göster ────────────────────────────────────────────────────────
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

  // ── PDF Sil ────────────────────────────────────────────────────────────────
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