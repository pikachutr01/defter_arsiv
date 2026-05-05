const normalize = (value) => String(value || '').replace(/\\/g, '/')

export const resolveStoredPath = (storagePath, storedPath) => {
  if (!storedPath) return null
  if (storedPath.startsWith('file://')) return storedPath.replace('file://', '')
  if (/^[a-zA-Z]:\//.test(normalize(storedPath))) return storedPath
  if (!storagePath) return storedPath
  const base = normalize(storagePath).replace(/\/$/, '')
  const tail = normalize(storedPath).replace(/^\/+/, '')
  return `${base}/${tail}`
}
