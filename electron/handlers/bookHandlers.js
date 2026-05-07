import fs from 'fs'
import path from 'path'
import sharp from 'sharp'
import { dialog } from 'electron'

// ─── Constants ───────────────────────────────────────────────────────────────

const COVER_MAX_SIZE = 1600
const COVER_QUALITY = 80

const bookNameCollator = new Intl.Collator('tr', {
  numeric: true,
  sensitivity: 'base',
})

// ─── Helpers ─────────────────────────────────────────────────────────────────

let _cachedStoragePath = undefined
const getStoragePath = (db) => {
  if (_cachedStoragePath !== undefined) return _cachedStoragePath
  _cachedStoragePath =
    db.prepare('SELECT value FROM settings WHERE key = ?').get('storage_path')
      ?.value ?? null
  return _cachedStoragePath
}

const removeIfExists = (targetPath) => {
  if (!targetPath || !fs.existsSync(targetPath)) return
  fs.rmSync(targetPath, { recursive: true, force: true })
}

const saveCoverImage = async (storagePath, bookId, sourcePath) => {
  const coversDir = path.join(storagePath, 'covers')
  fs.mkdirSync(coversDir, { recursive: true })

  const targetPath = path.join(coversDir, `book_${bookId}.jpg`)

  const instance = sharp(sourcePath, { failOn: 'none' }).rotate()
  const metadata = await instance.metadata()

  const pipeline = metadata.hasAlpha
    ? instance.flatten({ background: '#ffffff' })
    : instance

  await pipeline
    .resize({
      width: COVER_MAX_SIZE,
      height: COVER_MAX_SIZE,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({
      quality: COVER_QUALITY,
      mozjpeg: true,
      progressive: true,
      chromaSubsampling: '4:4:4',
    })
    .toFile(targetPath)

  return path.posix.join('covers', `book_${bookId}.jpg`)
}

const escapeXml = (str) =>
  String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

/**
 * Kitap adından klasik navy-gold çerçeveli yatay (landscape) placeholder kapak üretir.
 * Sol yarı: amblem dairesi + kitap ikonu. Sağ yarı: cilt adı metni.
 * Arka plan tonu cilt adına göre deterministik olarak kayar; altın aksanlar sabit kalır.
 */
const generatePlaceholderCover = async (storagePath, bookId, bookName) => {
  const W = 640
  const H = 400

  // Cilt adına göre deterministik arka plan — sabit altın aksanlarla uyumlu koyu palet
  let hash = 0
  for (let i = 0; i < bookName.length; i++) hash = bookName.charCodeAt(i) + ((hash << 5) - hash)
  const idx = Math.abs(hash) % 8
  const PALETTES = [
    ['hsl(215, 55%, 14%)', 'hsl(215, 50%, 20%)'], // lacivert
    ['hsl(200, 55%, 13%)', 'hsl(200, 50%, 19%)'], // koyu petrol
    ['hsl(240, 45%, 14%)', 'hsl(240, 40%, 21%)'], // koyu indigo
    ['hsl(345, 45%, 14%)', 'hsl(345, 40%, 20%)'], // bordo
    ['hsl(165, 45%, 11%)', 'hsl(165, 42%, 17%)'], // koyu zümrüt
    ['hsl(30,  40%, 13%)', 'hsl(30,  38%, 19%)'], // koyu amber
    ['hsl(270, 40%, 13%)', 'hsl(270, 37%, 19%)'], // koyu mor
    ['hsl(190, 50%, 12%)', 'hsl(190, 46%, 18%)'], // koyu camgöbeği
  ]
  const [bgDark, bgLight2] = PALETTES[idx]

  // ── Düzen sabitleri ──────────────────────────────────────────────────────
  const PAD = 36  // dış kenar boşluğu
  const DIV_X = W / 2  // sol/sağ yarıyı ayıran dikey çizginin x'i

  // Sol yarı: amblem merkezi
  const ambleX = Math.round(W * 0.25)
  const ambleY = Math.round(H / 2)
  const ambleR = 52

  // Sağ yarı: metin alanı x başlangıcı
  const textAreaX = DIV_X + 28
  const textAreaW = W - textAreaX - PAD  // kullanılabilir genişlik

  // Uzun adları satırlara böl — sağ alan yaklaşık 15 karaktere sığar
  const words = bookName.split(' ')
  const lines = []
  let current = ''
  for (const word of words) {
    const test = current ? `${current} ${word}` : word
    if (test.length > 14 && current) { lines.push(current); current = word }
    else current = test
  }
  if (current) lines.push(current)

  const lineHeight = 46
  const fontSize = lines.some(l => l.length > 11) ? 30 : 36
  const totalTextH = lines.length * lineHeight
  const textStartY = Math.round(H / 2 - totalTextH / 2 + lineHeight * 0.5)

  const textRows = lines
    .map((line, i) => `<text
      x="${textAreaX}"
      y="${textStartY + i * lineHeight}"
      dominant-baseline="middle"
      font-family="Georgia, 'Times New Roman', serif"
      font-size="${fontSize}"
      font-weight="700"
      fill="#f0e6c8"
      letter-spacing="1"
    >${escapeXml(line)}</text>`)
    .join('\n')

  const labelY = Math.round(textStartY + totalTextH + 28)

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%"   stop-color="${bgDark}" />
      <stop offset="100%" stop-color="${bgLight2}" />
    </linearGradient>
  </defs>

  <!-- Arka plan -->
  <rect width="${W}" height="${H}" fill="url(#bg)" />

  <!-- Yatay altın şeritler (üst-alt kenar) -->
  <rect x="0" y="${PAD}"       width="${W}" height="3" fill="#c9a84c" opacity="0.9" />
  <rect x="0" y="${H - PAD - 3}" width="${W}" height="3" fill="#c9a84c" opacity="0.9" />

  <!-- Dikey altın şeritler (sol-sağ kenar) -->
  <rect x="${PAD}"       y="0" width="3" height="${H}" fill="#c9a84c" opacity="0.9" />
  <rect x="${W - PAD - 3}" y="0" width="3" height="${H}" fill="#c9a84c" opacity="0.9" />

  <!-- Köşe süsleri — sol üst -->
  <rect x="${PAD}"     y="${PAD}"     width="30" height="3" fill="#c9a84c" />
  <rect x="${PAD}"     y="${PAD}"     width="3" height="30" fill="#c9a84c" />
  <!-- Köşe süsleri — sağ üst -->
  <rect x="${W - PAD - 30}" y="${PAD}"     width="30" height="3" fill="#c9a84c" />
  <rect x="${W - PAD - 3}"  y="${PAD}"     width="3" height="30" fill="#c9a84c" />
  <!-- Köşe süsleri — sol alt -->
  <rect x="${PAD}"     y="${H - PAD - 3}" width="30" height="3" fill="#c9a84c" />
  <rect x="${PAD}"     y="${H - PAD - 30}" width="3" height="30" fill="#c9a84c" />
  <!-- Köşe süsleri — sağ alt -->
  <rect x="${W - PAD - 30}" y="${H - PAD - 3}" width="30" height="3" fill="#c9a84c" />
  <rect x="${W - PAD - 3}"  y="${H - PAD - 30}" width="3" height="30" fill="#c9a84c" />

  <!-- Orta dikey ayırıcı çizgi -->
  <rect x="${DIV_X - 1}" y="${PAD + 20}" width="1.5" height="${H - (PAD + 20) * 2}" fill="#c9a84c" opacity="0.35" />

  <!-- Amblem: baş harf dairesi (sol yarı) -->
  <circle cx="${ambleX}" cy="${ambleY}" r="${ambleR}" fill="none" stroke="#c9a84c" stroke-width="1.5" opacity="0.7" />
  <circle cx="${ambleX}" cy="${ambleY}" r="${ambleR - 9}" fill="none" stroke="#c9a84c" stroke-width="0.5" opacity="0.35" />
  <!-- Kitap ikonu -->
  <g transform="translate(${ambleX - 18}, ${ambleY - 20})" fill="#c9a84c" opacity="0.88">
    <rect x="2" y="0" width="28" height="36" rx="2" fill="none" stroke="#c9a84c" stroke-width="2"/>
    <rect x="2" y="0" width="5"  height="36" rx="1" fill="#c9a84c" opacity="0.55"/>
    <rect x="10" y="7"  width="14" height="2" rx="1" fill="#c9a84c"/>
    <rect x="10" y="13" width="14" height="2" rx="1" fill="#c9a84c"/>
    <rect x="10" y="19" width="10" height="2" rx="1" fill="#c9a84c"/>
  </g>

  <!-- Amblem altı nokta süsler -->
  <circle cx="${ambleX - 14}" cy="${ambleY + ambleR + 14}" r="2" fill="#c9a84c" opacity="0.4" />
  <circle cx="${ambleX}"      cy="${ambleY + ambleR + 14}" r="3" fill="#c9a84c" opacity="0.65" />
  <circle cx="${ambleX + 14}" cy="${ambleY + ambleR + 14}" r="2" fill="#c9a84c" opacity="0.4" />

  <!-- Sağ yarı: metin bloğu üst ayırıcı -->
  <rect x="${textAreaX}" y="${textStartY - 20}" width="48" height="1.5" rx="1" fill="#c9a84c" opacity="0.7" />

  <!-- Cilt adı -->
  ${textRows}

  <!-- Alt etiket -->
  <text
    x="${textAreaX}"
    y="${labelY}"
    dominant-baseline="middle"
    font-family="Segoe UI, Arial, sans-serif"
    font-size="12"
    letter-spacing="4"
    fill="#c9a84c"
    opacity="0.75"
  >CİLT KAPAĞI</text>

</svg>`

  const coversDir = path.join(storagePath, 'covers')
  fs.mkdirSync(coversDir, { recursive: true })
  const targetPath = path.join(coversDir, `book_${bookId}.jpg`)

  await sharp(Buffer.from(svg))
    .jpeg({ quality: 90, mozjpeg: true, progressive: true })
    .toFile(targetPath)

  return path.posix.join('covers', `book_${bookId}.jpg`)
}

const applyCoverChanges = async (db, bookId, data) => {
  const storagePath = getStoragePath(db)
  if (!storagePath) return null

  const coverPath = path.join(storagePath, 'covers', `book_${bookId}.jpg`)

  if (data.remove_cover) {
    removeIfExists(coverPath)
    db.prepare(
      'UPDATE books SET cover_image = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(bookId)
    return null
  }

  if (data.cover_source_path) {
    const relativeCoverPath = await saveCoverImage(storagePath, bookId, data.cover_source_path)
    db.prepare(
      'UPDATE books SET cover_image = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(relativeCoverPath, bookId)
    return relativeCoverPath
  }

  return (
    db.prepare('SELECT cover_image FROM books WHERE id = ?').get(bookId)
      ?.cover_image ?? null
  )
}

// ─── Prepared Statements ─────────────────────────────────────────────────────

const buildStatements = (db) => ({
  getAllBooks: db.prepare(`
    SELECT b.*,
           COALESCE(SUM(p.is_uploaded), 0) AS image_count
    FROM books b
    LEFT JOIN pages p ON p.book_id = b.id
    GROUP BY b.id
    ORDER BY b.created_at DESC
  `),
  getById: db.prepare('SELECT * FROM books WHERE id = ?'),
  getCoverById: db.prepare('SELECT cover_image FROM books WHERE id = ?'),
  checkDuplicateName: db.prepare('SELECT id FROM books WHERE name = ? COLLATE NOCASE AND id != ?'),
  checkDuplicateNameNew: db.prepare('SELECT id FROM books WHERE name = ? COLLATE NOCASE'),
  insertBook: db.prepare(
    'INSERT INTO books (name, description, book_notes, total_pages, cover_image, storage_folder) VALUES (?, ?, ?, ?, ?, ?)'
  ),
  updateBook: db.prepare(
    'UPDATE books SET name = ?, description = ?, book_notes = ?, total_pages = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  ),
  updateCover: db.prepare('UPDATE books SET cover_image = ? WHERE id = ?'),
  deleteBook: db.prepare('DELETE FROM books WHERE id = ?'),
  checkPagesHaveData: db.prepare(
    'SELECT id FROM pages WHERE book_id = ? AND page_number > ? AND (is_uploaded = 1 OR page_notes IS NOT NULL) LIMIT 1'
  ),
  deletePagesAbove: db.prepare('DELETE FROM pages WHERE book_id = ? AND page_number > ?'),
  insertPage: db.prepare('INSERT INTO pages (book_id, page_number) VALUES (?, ?)'),
})

// ─── IPC Handlers ────────────────────────────────────────────────────────────

export const registerBookHandlers = ({ ipcMain, db }) => {
  const stmt = buildStatements(db)

  ipcMain.handle('books:getAll', () => {
    try {
      const rows = stmt.getAllBooks
        .all()
        .sort((a, b) => bookNameCollator.compare(a.name || '', b.name || ''))
      return { success: true, data: rows }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('books:getById', (_event, id) => {
    try {
      return { success: true, data: stmt.getById.get(id) }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('books:chooseCover', async () => {
    try {
      const result = await dialog.showOpenDialog({
        title: 'Kapak görseli seçin',
        properties: ['openFile'],
        filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp'] }],
      })
      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, canceled: true }
      }
      return { success: true, data: result.filePaths[0] }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('books:create', async (_event, data) => {
    try {
      const existing = stmt.checkDuplicateNameNew.get(data.name)
      if (existing) {
        return {
          success: false,
          error: 'Bu isimde bir cilt zaten var. Lütfen farklı bir isim girin.',
        }
      }

      const result = stmt.insertBook.run(
        data.name,
        data.description || null,
        data.book_notes || null,
        data.total_pages || 0,
        null,
        data.storage_folder || null
      )

      const bookId = result.lastInsertRowid

      if (data.cover_source_path) {
        await applyCoverChanges(db, bookId, data)
      } else {
        try {
          const storagePath = getStoragePath(db)
          if (storagePath) {
            const relPath = await generatePlaceholderCover(storagePath, bookId, data.name)
            stmt.updateCover.run(relPath, bookId)
          }
        } catch (coverErr) {
          console.warn('Placeholder kapak üretilemedi:', coverErr.message)
        }
      }

      return { success: true, data: stmt.getById.get(bookId) }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('books:update', async (_event, id, data) => {
    try {
      const duplicate = stmt.checkDuplicateName.get(data.name, id)
      if (duplicate) {
        return {
          success: false,
          error: 'Bu isimde bir cilt zaten var. Lütfen farklı bir isim girin.',
        }
      }

      const currentBook = stmt.getById.get(id)
      const currentTotal = currentBook.total_pages
      const newTotal = data.total_pages || 0

      if (newTotal < currentTotal) {
        const hasData = stmt.checkPagesHaveData.get(id, newTotal)
        if (hasData) {
          return {
            success: false,
            error: `Sayfa sayısını ${newTotal}'a düşüremezsiniz. Çünkü silinecek olan ${newTotal + 1} ile ${currentTotal} numaralı sayfalar arasında not veya resim içeren kayıtlar var. Lütfen önce o sayfaları temizleyin.`,
          }
        }
        stmt.deletePagesAbove.run(id, newTotal)
      } else if (newTotal > currentTotal) {
        db.transaction(() => {
          for (let i = currentTotal + 1; i <= newTotal; i++) {
            stmt.insertPage.run(id, i)
          }
        })()
      }

      stmt.updateBook.run(data.name, data.description || null, data.book_notes || null, newTotal, id)

      await applyCoverChanges(db, id, data)

      // Kapak yoksa ya da placeholder'dayken ad değiştiyse yeniden üret
      if (!data.cover_source_path && !data.remove_cover) {
        try {
          const storagePath = getStoragePath(db)
          if (storagePath) {
            const currentCover = stmt.getCoverById.get(id)?.cover_image
            const needsPlaceholder = !currentCover
            const isPlaceholderAndNameChanged =
              currentCover?.includes(`book_${id}.jpg`) && data.name !== currentBook.name

            if (needsPlaceholder || isPlaceholderAndNameChanged) {
              const relPath = await generatePlaceholderCover(storagePath, id, data.name)
              stmt.updateCover.run(relPath, id)
            }
          }
        } catch (coverErr) {
          console.warn('Placeholder kapak güncellenemedi:', coverErr.message)
        }
      }

      return { success: true, data: stmt.getById.get(id) }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('books:delete', (_event, id) => {
    try {
      const storagePath = getStoragePath(db)
      if (storagePath) {
        removeIfExists(path.join(storagePath, 'covers', `book_${id}.jpg`))
        removeIfExists(path.join(storagePath, 'books', `book_${id}`))
      }
      stmt.deleteBook.run(id)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('books:setCover', async (_event, id, imagePath) => {
    try {
      const relativeCoverPath = await applyCoverChanges(db, id, { cover_source_path: imagePath })
      return { success: true, data: relativeCoverPath }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })
}