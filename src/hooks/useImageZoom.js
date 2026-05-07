import { useEffect, useRef, useState, useCallback } from 'react'

export function useImageZoom({ minScale = 1, maxScale = 5, zoomSpeed = 0.1, enablePan = false } = {}) {
  const containerRef = useRef(null)
  const [scale, setScale] = useState(1)
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 })

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleWheel = (e) => {
      // Sadece Ctrl tuşuna basılıyken çalışsın
      if (!e.ctrlKey) return

      // Tarayıcının varsayılan sayfa yakınlaştırmasını engelle
      e.preventDefault()

      const rect = container.getBoundingClientRect()

      // Fare pozisyonu (konteynerin görünen kısmına göre)
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top

      // O anki scroll pozisyonu ile resim üzerindeki hedef piksel hesaplanır
      const scrollLeft = container.scrollLeft
      const scrollTop = container.scrollTop
      const imgX = mouseX + scrollLeft
      const imgY = mouseY + scrollTop

      setScale((prev) => {
        // DeltaY negatifse yukarı kaydırma (yakınlaştır), pozitifse aşağı (uzaklaştır)
        const delta = e.deltaY < 0 ? zoomSpeed : -zoomSpeed
        const next = Math.min(Math.max(prev + delta, minScale), maxScale)

        // Sınır değere ulaşıldıysa işlem yapma
        if (next === prev) return prev

        const ratio = next / prev
        const newImgX = imgX * ratio
        const newImgY = imgY * ratio

        // DOM hemen güncellenmeyeceği için scroll'u bir sonraki frame'de ayarla
        requestAnimationFrame(() => {
          if (container) {
            container.scrollLeft = newImgX - mouseX
            container.scrollTop = newImgY - mouseY
          }
        })

        return next
      })
    }

    // React'ın onWheel event'i passive olduğu için preventDefault çalışmaz.
    // Bu yüzden native event listener kullanıyoruz.
    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => container.removeEventListener('wheel', handleWheel)
  }, [minScale, maxScale, zoomSpeed])

  const resetZoom = useCallback(() => setScale(1), [])

  const handleMouseDown = useCallback((e) => {
    if (!enablePan || e.button !== 0) return // Sadece sol tık ve pan açıksa
    const container = containerRef.current
    if (!container) return

    setIsDragging(true)
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      scrollLeft: container.scrollLeft,
      scrollTop: container.scrollTop
    }
  }, [enablePan])

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e) => {
      const container = containerRef.current
      if (!container) return

      const dx = e.clientX - dragStartRef.current.x
      const dy = e.clientY - dragStartRef.current.y

      container.scrollLeft = dragStartRef.current.scrollLeft - dx
      container.scrollTop = dragStartRef.current.scrollTop - dy
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging])

  return { containerRef, scale, resetZoom, handleMouseDown, isDragging }
}
