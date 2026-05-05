import { useEffect, useRef, useState, useCallback } from 'react'
import Modal from '../shared/Modal.jsx'
import useSettingsStore from '../../store/useSettingsStore.js'
import { toLocalAssetUrl } from '../../utils/paths.js'

const TOOLS = { PEN: 'pen', ERASER: 'eraser' }
const COLORS = ['#ff4444', '#ffcc00', '#44dd88', '#4f8ef7', '#ffffff', '#000000']
const MAX_UNDO = 30

// local-file:// URL'yi fetch ile çekip temiz bir blob URL'ye dönüştürür.
// Bu sayede canvas "tainted" olmaz ve getImageData çalışır.
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

export default function AnnotationCanvas({ item, onClose, onSave }) {
  const storagePath = useSettingsStore((state) => state.storagePath)
  const canvasRef = useRef(null)
  const overlayRef = useRef(null)
  const isDrawingRef = useRef(false)
  const undoStackRef = useRef([])
  // Blob URL'yi ref'te tut — temizleme için lazım
  const blobUrlRef = useRef(null)
  const [tool, setTool] = useState(TOOLS.PEN)
  const [color, setColor] = useState('#ff4444')
  const [lineWidth, setLineWidth] = useState(3)
  const [hasAnnotation, setHasAnnotation] = useState(!!item.annotatedDataUrl)
  const [isLoading, setIsLoading] = useState(true)
  const [canUndo, setCanUndo] = useState(false)

  const imageUrl = toLocalAssetUrl(storagePath, item.imagePath)

  // Canvas'a base image yükle — fetch ile blob'a çevir, tainted sorununu önle
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !imageUrl) return

    let cancelled = false

    const init = async () => {
      try {
        const blobUrl = await loadImageAsBlobUrl(imageUrl)
        if (cancelled) { URL.revokeObjectURL(blobUrl); return }
        blobUrlRef.current = blobUrl

        const img = await loadImage(blobUrl)
        if (cancelled) return

        const ctx = canvas.getContext('2d')

        const maxW = 1400
        const maxH = 1000
        let w = img.naturalWidth
        let h = img.naturalHeight
        if (w > maxW) { h = Math.round(h * maxW / w); w = maxW }
        if (h > maxH) { w = Math.round(w * maxH / h); h = maxH }
        canvas.width = w
        canvas.height = h

        ctx.drawImage(img, 0, 0, w, h)

        // Varsa önceki annotation'ı üstüne çiz (data URL, zaten temiz)
        if (item.annotatedDataUrl) {
          const annotImg = await loadImage(item.annotatedDataUrl)
          if (!cancelled) ctx.drawImage(annotImg, 0, 0, w, h)
        }

        undoStackRef.current = [ctx.getImageData(0, 0, w, h)]
        if (!cancelled) setCanUndo(false)
        if (!cancelled) setIsLoading(false)
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

  const saveSnapshot = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const stack = undoStackRef.current
    stack.push(ctx.getImageData(0, 0, canvas.width, canvas.height))
    if (stack.length > MAX_UNDO) stack.shift()
    setCanUndo(stack.length > 1)
  }, [])

  const getPos = (event) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const clientX = event.touches ? event.touches[0].clientX : event.clientX
    const clientY = event.touches ? event.touches[0].clientY : event.clientY
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    }
  }

  const startDraw = useCallback((event) => {
    event.preventDefault()
    const canvas = canvasRef.current
    if (!canvas || isLoading) return
    saveSnapshot()
    isDrawingRef.current = true
    const ctx = canvas.getContext('2d')
    const { x, y } = getPos(event)
    ctx.beginPath()
    ctx.moveTo(x, y)
  }, [saveSnapshot, isLoading])

  const draw = useCallback((event) => {
    event.preventDefault()
    if (!isDrawingRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const { x, y } = getPos(event)
    ctx.lineTo(x, y)
    ctx.lineWidth = tool === TOOLS.ERASER ? lineWidth * 6 : lineWidth
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = tool === TOOLS.ERASER ? '#000000' : color
    ctx.globalCompositeOperation = tool === TOOLS.ERASER ? 'destination-out' : 'source-over'
    ctx.stroke()
    setHasAnnotation(true)
  }, [tool, color, lineWidth])

  const endDraw = useCallback((event) => {
    event?.preventDefault()
    isDrawingRef.current = false
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.globalCompositeOperation = 'source-over'
  }, [])

  const handleUndo = () => {
    const stack = undoStackRef.current
    if (stack.length <= 1) return
    stack.pop()
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.putImageData(stack[stack.length - 1], 0, 0)
    if (stack.length <= 1) setHasAnnotation(false)
    setCanUndo(stack.length > 1)
  }

  const handleClear = async () => {
    const canvas = canvasRef.current
    if (!canvas || !blobUrlRef.current) return
    const ctx = canvas.getContext('2d')
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
  }

  const handleSave = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
    onSave(dataUrl)
    onClose()
  }

  const handleRemoveAnnotation = () => {
    onSave(null)
    onClose()
  }

  return (
    <Modal title="Çizim Düzenleyici" onClose={onClose} panelClassName="max-w-[85vw] w-full">
      {/* Araç çubuğu */}
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3">
        {/* Araç seçimi */}
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setTool(TOOLS.PEN)}
            title="Kalem"
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              tool === TOOLS.PEN
                ? 'bg-[var(--accent)] text-white'
                : 'border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            ✏️ Kalem
          </button>
          <button
            type="button"
            onClick={() => setTool(TOOLS.ERASER)}
            title="Silgi"
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              tool === TOOLS.ERASER
                ? 'bg-[var(--accent)] text-white'
                : 'border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            🧹 Silgi
          </button>
        </div>

        {/* Renk seçici */}
        <div className="flex items-center gap-1.5">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => { setColor(c); setTool(TOOLS.PEN) }}
              style={{ backgroundColor: c }}
              className={`h-6 w-6 rounded-full border-2 transition ${
                color === c && tool === TOOLS.PEN
                  ? 'border-[var(--accent)] scale-125'
                  : 'border-[var(--border)]'
              }`}
            />
          ))}
          <input
            type="color"
            value={color}
            onChange={(e) => { setColor(e.target.value); setTool(TOOLS.PEN) }}
            title="Özel renk"
            className="h-6 w-6 cursor-pointer rounded border border-[var(--border)] bg-transparent"
          />
        </div>

        {/* Kalınlık */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--text-muted)]">Kalınlık</span>
          <input
            type="range"
            min="1"
            max="20"
            value={lineWidth}
            onChange={(e) => setLineWidth(Number(e.target.value))}
            className="w-24 accent-[var(--accent)]"
          />
          <span className="w-5 text-xs text-[var(--text-muted)]">{lineWidth}</span>
        </div>

        {/* Geri al / Temizle */}
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={handleUndo}
            disabled={!canUndo}
            className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--text-muted)] transition hover:border-[var(--accent)] hover:text-[var(--text-primary)] disabled:opacity-40"
          >
            ↩ Geri Al
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="rounded-lg border border-[var(--danger-border)] px-3 py-1.5 text-xs text-[var(--text-primary)] transition hover:border-[var(--danger-strong)]"
          >
            Temizle
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={overlayRef}
        className="relative overflow-auto rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)]"
        style={{ maxHeight: '65vh' }}
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-[var(--text-muted)]">
            Yükleniyor...
          </div>
        )}
        <canvas
          ref={canvasRef}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
          style={{
            cursor: isLoading ? 'wait' : tool === TOOLS.ERASER ? 'cell' : 'crosshair',
            display: 'block',
            maxWidth: '100%',
            opacity: isLoading ? 0 : 1,
          }}
        />
      </div>

      {/* Alt butonlar */}
      <div className="mt-4 flex items-center justify-between gap-3">
        <div>
          {hasAnnotation && (
            <button
              type="button"
              onClick={handleRemoveAnnotation}
              className="rounded-lg border border-[var(--danger-border)] px-3 py-2 text-xs text-[var(--text-primary)] transition hover:border-[var(--danger-strong)]"
            >
              Çizimi Kaldır
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-[var(--text-muted)] transition hover:border-[var(--accent)] hover:text-[var(--text-primary)]"
          >
            Vazgeç
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isLoading}
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)] disabled:opacity-50"
          >
            Kaydet
          </button>
        </div>
      </div>
    </Modal>
  )
}