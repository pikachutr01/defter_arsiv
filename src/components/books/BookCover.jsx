import useSettingsStore from '../../store/useSettingsStore.js'
import { toLocalAssetUrl } from '../../utils/paths.js'

export default function BookCover({ coverPath, title }) {
  const storagePath = useSettingsStore((state) => state.storagePath)
  const imageUrl = toLocalAssetUrl(storagePath, coverPath)

  return (
    <div className="relative h-44 w-full overflow-hidden bg-[var(--bg-elevated)]">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={title}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
          {title?.[0]?.toUpperCase() ?? '?'}
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-[rgba(8,12,20,0.75)] via-transparent" />
    </div>
  )
}
