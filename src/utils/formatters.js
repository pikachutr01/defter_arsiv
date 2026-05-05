export const formatDateTime = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  return date.toLocaleString('tr-TR')
}

export const formatCount = (value) => {
  if (typeof value !== 'number') return '0'
  return new Intl.NumberFormat('tr-TR').format(value)
}
