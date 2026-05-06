const normalize = (value) => String(value || '').replace(/\\/g, '/')

export const resolveStoredPath = (storagePath, storedPath) => {
  if (!storedPath) return null
  if (storedPath.startsWith('file://')) return storedPath.replace('file://', '')
  if (/^[a-zA-Z]:\//.test(normalize(storedPath))) return storedPath
  if (!storagePath) return null
  const base = normalize(storagePath).replace(/\/$/, '')
  const tail = normalize(storedPath).replace(/^\/+/, '')
  return `${base}/${tail}`
}

export const toLocalAssetUrl = (storagePath, storedPath, t = null) => {
  const resolvedPath = resolveStoredPath(storagePath, storedPath)
  if (!resolvedPath) return null

  let url = `local-file://asset?path=${encodeURIComponent(resolvedPath)}`
  if (t) {
    url += `&t=${t}`
  }
  return url
}
