import Modal from '../shared/Modal.jsx'
import useSettingsStore from '../../store/useSettingsStore.js'
import { toLocalAssetUrl } from '../../utils/paths.js'
import { useImageZoom } from '../../hooks/useImageZoom.js'

export default function ImageViewer({ title, imagePath, timestamp, onClose, panelClassName = 'max-w-6xl' }) {
  const storagePath = useSettingsStore((state) => state.storagePath)
  const imageUrl = toLocalAssetUrl(storagePath, imagePath, timestamp)
  const { containerRef, scale, handleMouseDown, isDragging } = useImageZoom({ 
    maxScale: 6, 
    zoomSpeed: 0.15,
    enablePan: true 
  })

  let cursorClass = 'cursor-zoom-in'
  if (isDragging) {
    cursorClass = 'cursor-grabbing'
  } else if (scale > 1.05) {
    cursorClass = 'cursor-grab'
  }

  return (
    <Modal title={title} onClose={onClose} panelClassName={panelClassName}>
      <div 
        ref={containerRef}
        onMouseDown={handleMouseDown}
        className={`max-h-[88vh] overflow-auto rounded-xl border border-[var(--border)] bg-[rgba(255,255,255,0.02)] select-none ${cursorClass}`}
        title="Ctrl + Fare Tekerleği ile yakınlaştır, sürükleyerek kaydır"
      >
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt={title} 
            draggable={false}
            className="mx-auto h-auto block" 
            style={{ width: `${scale * 100}%`, maxWidth: 'none' }} 
          />
        ) : null}
      </div>
    </Modal>
  )
}
