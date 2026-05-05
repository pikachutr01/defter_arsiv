import useSettingsStore from '../../store/useSettingsStore.js'
import { resolveStoredPath } from '../../utils/paths.js'

export default function ThumbnailGrid({ items, onSelect }) {
  const storagePath = useSettingsStore((state) => state.storagePath)

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onSelect(item)}
          className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)]"
        >
          {resolveStoredPath(storagePath, item.thumbnail) ? (
            <img
              src={`file://${resolveStoredPath(storagePath, item.thumbnail)}`}
              alt={item.label}
            />
          ) : null}
        </button>
      ))}
    </div>
  )
}
