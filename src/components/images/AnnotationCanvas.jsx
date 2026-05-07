import { useEffect, useRef, useState, useCallback } from 'react'
import Modal from '../shared/Modal.jsx'
import useSettingsStore from '../../store/useSettingsStore.js'
import { toLocalAssetUrl } from '../../utils/paths.js'
import { useImageZoom } from '../../hooks/useImageZoom.js'

const TOOLS = { PEN: 'pen', ERASER: 'eraser', RECTANGLE: 'rectangle', CIRCLE: 'circle' }
const COLORS = ['#ff4444', '#ffcc00', '#44dd88', '#4f8ef7', '#ffffff', '#000000']
const MAX_UNDO = 30

const TOOL_BUTTONS = [
  { id: TOOLS.PEN, label: '✏️ Kalem', title: 'Kalem' },
  { id: TOOLS.RECTANGLE, label: '⬜ Dikdörtgen', title: 'Dikdörtgen' },
  { id: TOOLS.CIRCLE, label: '⭕ Çember', title: 'Çember / Elips' },
  { id: TOOLS.ERASER, label: '🧹 Silgi', title: 'Silgi' },
]

// ─── Yardımcılar ─────────────────────────────────────────────────────────────

const loadImageAsBlobUrl = async (url) => {
  const response = await fetch(url)
  const blob = await response.blob()
  return URL.createObjectURL(blob)
}

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })

// ─── Bileşen ─────────────────────────────────────────────────────────────────

export default function AnnotationCanvas({ item, onClose, onSave }) {
  const storagePath = useSettingsStore((state) => state.storagePath)

  // Canvas & çizim ref'leri
  const canvasRef = useRef(null)   // ana canvas (kalıcı çizimler)
  const overlayRef = useRef(null)   // şekil önizleme overlay canvas'ı
  const ctxRef = useRef(null)   // ana canvas 2d context (bir kez alınır)
  const overlayCtxRef = useRef(null)   // overlay context
  const isDrawingRef = useRef(false)
  const undoStackRef = useRef([])
  const shapeStartRef = useRef(null)
  const blobUrlRef = useRef(null)
  // getBoundingClientRect sonucunu cache'le — mousemove başına bir reflow önler
  const rectCacheRef = useRef(null)

  const [tool, setTool] = useState(TOOLS.PEN)
  const [color, setColor] = useState('#ff4444')
  const [lineWidth, setLineWidth] = useState(3)
  const [hasAnnotation, setHasAnnotation] = useState(!!item.annotatedDataUrl)
  const [isLoading, setIsLoading] = useState(true)
  const [canUndo, setCanUndo] = useState(false)

  const { containerRef, scale } = useImageZoom({ maxScale: 5, zoomSpeed: 0.15 })
  const imageUrl = toLocalAssetUrl(storagePath, item.imagePath)

  // ── Canvas başlatma ────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    const overlay = overlayRef.current
    if (!canvas || !overlay || !imageUrl) return

    let cancelled = false

    const init = async () => {
      try {
        const blobUrl = await loadImageAsBlobUrl(imageUrl)
        if (cancelled) { URL.revokeObjectURL(blobUrl); return }
        blobUrlRef.current = blobUrl

        const img = await loadImage(blobUrl)
        if (cancelled) return

        const ctx = canvas.getContext('2d')
        ctxRef.current = ctx

        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight

        // Overlay canvas'ı ana canvas ile aynı boyuta getir
        overlay.width = img.naturalWidth
        overlay.height = img.naturalHeight
        overlayCtxRef.current = overlay.getContext('2d')

        ctx.drawImage(img, 0, 0)

        if (item.annotatedDataUrl) {
          const annotImg = await loadImage(item.annotatedDataUrl)
          if (!cancelled) ctx.drawImage(annotImg, 0, 0)
        }

        undoStackRef.current = [ctx.getImageData(0, 0, canvas.width, canvas.height)]
        if (!cancelled) { setCanUndo(false); setIsLoading(false) }
      } catch (err) {
        console.error('AnnotationCanvas: resim yüklenemedi', err)
        if (!cancelled) setIsLoading(false)
      }
    }

    init()

    return () => {
      cancelled = true
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current)
        blobUrlRef.current = null
      }
    }
  }, [imageUrl, item.annotatedDataUrl])

  // ── Snapshot ───────────────────────────────────────────────────────────────
  const saveSnapshot = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = ctxRef.current
    if (!canvas || !ctx) return
    const stack = undoStackRef.current
    stack.push(ctx.getImageData(0, 0, canvas.width, canvas.height))
    if (stack.length > MAX_UNDO) stack.shift()
    setCanUndo(stack.length > 1)
  }, [])

  // ── Koordinat hesaplama (cache'lenmiş rect) ────────────────────────────────
  const getPos = useCallback((event) => {
    const canvas = canvasRef.current
    const rect = rectCacheRef.current ?? canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const src = event.touches ? event.touches[0] : event
    return {
      x: (src.clientX - rect.left) * scaleX,
      y: (src.clientY - rect.top) * scaleY,
    }
  }, [])

  // ── Çizim başlat ──────────────────────────────────────────────────────────
  const startDraw = useCallback((event) => {
    event.preventDefault()
    if (!canvasRef.current || isLoading) return

    // rect'i çizim başında bir kez cache'le
    rectCacheRef.current = canvasRef.current.getBoundingClientRect()

    saveSnapshot()
    isDrawingRef.current = true

    const ctx = ctxRef.current
    const { x, y } = getPos(event)

    if (tool === TOOLS.RECTANGLE || tool === TOOLS.CIRCLE) {
      shapeStartRef.current = { x, y }
    } else {
      ctx.beginPath()
      ctx.moveTo(x, y)
    }
  }, [saveSnapshot, isLoading, tool, getPos])

  // ── Çizim sürdür ──────────────────────────────────────────────────────────
  const draw = useCallback((event) => {
    event.preventDefault()
    if (!isDrawingRef.current) return

    const ctx = ctxRef.current
    const { x, y } = getPos(event)

    if (tool === TOOLS.RECTANGLE || tool === TOOLS.CIRCLE) {
      // Şekil önizlemesi overlay canvas'ta yapılır — ana canvas'a dokunulmaz
      const overlay = overlayRef.current
      const octx = overlayCtxRef.current
      const { x: sx, y: sy } = shapeStartRef.current

      octx.clearRect(0, 0, overlay.width, overlay.height)
      octx.lineWidth = lineWidth
      octx.strokeStyle = color
      octx.lineCap = 'round'
      octx.lineJoin = 'round'
      octx.beginPath()

      if (tool === TOOLS.RECTANGLE) {
        octx.rect(sx, sy, x - sx, y - sy)
      } else {
        const rx = Math.abs(x - sx) / 2
        const ry = Math.abs(y - sy) / 2
        octx.ellipse(sx + (x - sx) / 2, sy + (y - sy) / 2, rx, ry, 0, 0, 2 * Math.PI)
      }

      octx.stroke()
      return
    }

    // Kalem / Silgi
    ctx.lineTo(x, y)
    ctx.lineWidth = tool === TOOLS.ERASER ? lineWidth * 6 : lineWidth
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = tool === TOOLS.ERASER ? '#000000' : color
    ctx.globalCompositeOperation = tool === TOOLS.ERASER ? 'destination-out' : 'source-over'
    ctx.stroke()
  }, [tool, color, lineWidth, getPos])

  // ── Çizim bitir ───────────────────────────────────────────────────────────
  const endDraw = useCallback((event) => {
    event?.preventDefault()
    if (!isDrawingRef.current) return
    isDrawingRef.current = false

    const ctx = ctxRef.current
    const overlay = overlayRef.current
    const octx = overlayCtxRef.current

    ctx.globalCompositeOperation = 'source-over'
    rectCacheRef.current = null   // rect cache'ini sıfırla

    // Overlay'deki şekli ana canvas'a işle, overlay'i temizle
    if (overlay && octx) {
      ctx.drawImage(overlay, 0, 0)
      octx.clearRect(0, 0, overlay.width, overlay.height)
    }

    setHasAnnotation(true)
  }, [])

  // ── Geri al ───────────────────────────────────────────────────────────────
  const handleUndo = useCallback(() => {
    const stack = undoStackRef.current
    if (stack.length <= 1) return
    stack.pop()
    ctxRef.current.putImageData(stack[stack.length - 1], 0, 0)
    if (stack.length <= 1) setHasAnnotation(false)
    setCanUndo(stack.length > 1)
  }, [])

  // ── Temizle ───────────────────────────────────────────────────────────────
  const handleClear = useCallback(async () => {
    const canvas = canvasRef.current
    const ctx = ctxRef.current
    if (!canvas || !ctx || !blobUrlRef.current) return
    saveSnapshot()
    try {
      const img = await loadImage(blobUrlRef.current)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      setHasAnnotation(false)
      setCanUndo(true)
    } catch (err) {
      console.error('Temizleme başarısız', err)
    }
  }, [saveSnapshot])

  // ── Kaydet ────────────────────────────────────────────────────────────────
  const handleSave = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    onSave(canvas.toDataURL('image/jpeg', 0.98))
    onClose()
  }, [onSave, onClose])

  const handleRemoveAnnotation = useCallback(() => {
    onSave(null)
    onClose()
  }, [onSave, onClose])

  const handleColorSelect = useCallback((c) => {
    setColor(c)
    setTool(TOOLS.PEN)
  }, [])

  // ── Ortak tool button className ───────────────────────────────────────────
  const toolBtnClass = (id) =>
    `rounded-lg px-3 py-1.5 text-xs font-semibold transition ${tool === id
      ? 'bg-[var(--accent)] text-white'
      : 'border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
    }`

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Modal title="Çizim Düzenleyici" onClose={onClose} panelClassName="max-w-[75vw] w-full">
      {/* Araç çubuğu */}
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3">

        {/* Araç seçimi */}
        <div className="flex gap-1">
          {TOOL_BUTTONS.map(({ id, label, title }) => (
            <button key={id} type="button" title={title}
              onClick={() => setTool(id)} className={toolBtnClass(id)}>
              {label}
            </button>
          ))}
        </div>

        {/* Renk seçici */}
        <div className="flex items-center gap-1.5">
          {COLORS.map((c) => (
            <button key={c} type="button" onClick={() => handleColorSelect(c)}
              style={{ backgroundColor: c }}
              className={`h-6 w-6 rounded-full border-2 transition ${color === c && tool === TOOLS.PEN
                  ? 'border-[var(--accent)] scale-125'
                  : 'border-[var(--border)]'
                }`}
            />
          ))}
          <input type="color" value={color} title="Özel renk"
            onChange={(e) => handleColorSelect(e.target.value)}
            className="h-6 w-6 cursor-pointer rounded border border-[var(--border)] bg-transparent"
          />
        </div>

        {/* Kalınlık */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--text-muted)]">Kalınlık</span>
          <input type="range" min="1" max="20" value={lineWidth}
            onChange={(e) => setLineWidth(Number(e.target.value))}
            className="w-24 accent-[var(--accent)]"
          />
          <span className="w-5 text-xs text-[var(--text-muted)]">{lineWidth}</span>
        </div>

        {/* Geri al / Temizle */}
        <div className="ml-auto flex gap-2">
          <button type="button" onClick={handleUndo} disabled={!canUndo}
            className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--text-muted)] transition hover:border-[var(--accent)] hover:text-[var(--text-primary)] disabled:opacity-40">
            ↩ Geri Al
          </button>
          <button type="button" onClick={handleClear}
            className="rounded-lg border border-[var(--danger-border)] px-3 py-1.5 text-xs text-[var(--text-primary)] transition hover:border-[var(--danger-strong)]">
            Temizle
          </button>
        </div>
      </div>

      {/* Canvas alanı — overlay canvas şekil önizlemesi için üst üste konumlandırılır */}
      <div ref={containerRef}
        className="relative overflow-auto rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)]"
        style={{ maxHeight: '65vh' }}
        title="Ctrl + Fare Tekerleği ile yakınlaştır/uzaklaştır"
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-[var(--text-muted)]">
            Yükleniyor...
          </div>
        )}

        {/* Ana canvas */}
        <canvas ref={canvasRef}
          onMouseDown={startDraw} onMouseMove={draw}
          onMouseUp={endDraw} onMouseLeave={endDraw}
          onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw}
          style={{
            cursor: isLoading ? 'wait' : tool === TOOLS.ERASER ? 'cell' : 'crosshair',
            display: 'block',
            maxWidth: 'none',
            width: `${scale * 100}%`,
            opacity: isLoading ? 0 : 1,
          }}
        />

        {/* Overlay canvas — pointer-events:none ile çizim eventlerini bloke etmez */}
        <canvas ref={overlayRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: `${scale * 100}%`,
            maxWidth: 'none',
            pointerEvents: 'none',
            opacity: isLoading ? 0 : 1,
          }}
        />
      </div>

      {/* Alt butonlar */}
      <div className="mt-4 flex items-center justify-between gap-3">
        <div>
          {hasAnnotation && (
            <button type="button" onClick={handleRemoveAnnotation}
              className="rounded-lg border border-[var(--danger-border)] px-3 py-2 text-xs text-[var(--text-primary)] transition hover:border-[var(--danger-strong)]">
              Çizimi Kaldır
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onClose}
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-[var(--text-muted)] transition hover:border-[var(--accent)] hover:text-[var(--text-primary)]">
            Vazgeç
          </button>
          <button type="button" onClick={handleSave} disabled={isLoading}
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)] disabled:opacity-50">
            Kaydet
          </button>
        </div>
      </div>
    </Modal>
  )
}