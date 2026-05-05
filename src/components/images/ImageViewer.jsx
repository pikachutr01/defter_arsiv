import Modal from '../shared/Modal.jsx'
import useSettingsStore from '../../store/useSettingsStore.js'
import { resolveStoredPath } from '../../utils/paths.js'

export default function ImageViewer({ title, imagePath, onClose }) {
  const storagePath = useSettingsStore((state) => state.storagePath)
  const resolvedPath = resolveStoredPath(storagePath, imagePath)

  return (
    <Modal title={title} onClose={onClose}>
      <div className="overflow-hidden rounded-xl border border-[var(--border)]">
        {resolvedPath ? (
          <img src={`file://${resolvedPath}`} alt={title} className="w-full" />
        ) : null}
      </div>
    </Modal>
  )
}
