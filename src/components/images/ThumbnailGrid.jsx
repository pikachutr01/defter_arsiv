import useSettingsStore from '../../store/useSettingsStore.js'
import { toLocalAssetUrl } from '../../utils/paths.js'

export default function ThumbnailGrid({ items, onSelect }) {
  const storagePath = useSettingsStore((state) => state.storagePath)

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => {
        const imageUrl = toLocalAssetUrl(storagePath, item.thumbnail)

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item)}
            className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)]"
          >
            {imageUrl ? <img src={imageUrl} alt={item.label} /> : null}
          </button>
        )
      })}
    </div>
  )
}
