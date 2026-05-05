import Modal from '../shared/Modal.jsx'
import useSettingsStore from '../../store/useSettingsStore.js'
import { toLocalAssetUrl } from '../../utils/paths.js'

export default function ImageViewer({ title, imagePath, onClose }) {
  const storagePath = useSettingsStore((state) => state.storagePath)
  const imageUrl = toLocalAssetUrl(storagePath, imagePath)

  return (
    <Modal title={title} onClose={onClose} panelClassName="max-w-6xl">
      <div className="max-h-[78vh] overflow-auto rounded-xl border border-[var(--border)] bg-[rgba(255,255,255,0.02)]">
        {imageUrl ? (
          <img src={imageUrl} alt={title} className="mx-auto h-auto max-w-full" />
        ) : null}
      </div>
    </Modal>
  )
}
