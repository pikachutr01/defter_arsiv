import { useMemo, useState } from 'react'
import Modal from '../shared/Modal.jsx'
import { ipc } from '../../utils/ipc.js'
import useSettingsStore from '../../store/useSettingsStore.js'
import { toLocalAssetUrl } from '../../utils/paths.js'

const buildInitialState = (book) => ({
  name: book?.name || '',
  description: book?.description || '',
  book_notes: book?.book_notes || '',
  total_pages: book?.total_pages || 0,
})

export default function BookForm({ book = null, onClose, onSubmit }) {
  const storagePath = useSettingsStore((state) => state.storagePath)
  const [formState, setFormState] = useState(buildInitialState(book))
  const [coverSourcePath, setCoverSourcePath] = useState(null)
  const [removeCover, setRemoveCover] = useState(false)

  const previewPath = useMemo(() => {
    if (coverSourcePath) {
      return coverSourcePath
    }

    if (removeCover) {
      return null
    }

    return book?.cover_image || null
  }, [book?.cover_image, coverSourcePath, removeCover])

  const previewUrl = previewPath ? toLocalAssetUrl(storagePath, previewPath) : null

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormState((prev) => ({
      ...prev,
      [name]: name === 'total_pages' ? Number(value) : value,
    }))
  }

  const handleChooseCover = async () => {
    const result = await ipc.booksChooseCover()
    if (!result.success) {
      return
    }

    setCoverSourcePath(result.data)
    setRemoveCover(false)
  }

  const handleRemoveCover = () => {
    setCoverSourcePath(null)
    setRemoveCover(true)
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    onSubmit({
      ...formState,
      cover_source_path: coverSourcePath,
      remove_cover: removeCover,
    })
  }

  return (
    <Modal
      title={book ? 'Cildi Düzenle' : 'Yeni Cilt'}
      onClose={onClose}
      panelClassName="max-w-[85vw]"
    >
      <form className="grid gap-8 lg:grid-cols-[1.45fr_1fr]" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-4">
          <label className="text-xs text-[var(--text-muted)]">
            Cilt Adı
            <input
              name="name"
              value={formState.name}
              onChange={handleChange}
              className="mt-2 w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm text-[var(--text-primary)]"
              required
            />
          </label>
          <label className="text-xs text-[var(--text-muted)]">
            Açıklama
            <textarea
              name="description"
              value={formState.description}
              onChange={handleChange}
              rows={5}
              className="mt-2 w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm text-[var(--text-primary)]"
            />
          </label>
          <label className="text-xs text-[var(--text-muted)]">
            Cilt Notu
            <textarea
              name="book_notes"
              value={formState.book_notes}
              onChange={handleChange}
              rows={8}
              className="mt-2 w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm text-[var(--text-primary)]"
            />
          </label>
          <label className="text-xs text-[var(--text-muted)]">
            Toplam Sayfa
            <input
              name="total_pages"
              type="number"
              min="0"
              value={formState.total_pages}
              onChange={handleChange}
              className="mt-2 w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm text-[var(--text-primary)]"
            />
          </label>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5">
          <h4 className="text-base text-[var(--text-primary)]">Kapak Görseli</h4>
          <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)]">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Kapak önizleme"
                className="h-[26rem] w-full object-cover"
              />
            ) : (
              <div className="flex h-[26rem] items-center justify-center text-sm text-[var(--text-muted)]">
                Kapak görseli seçilmedi
              </div>
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleChooseCover}
              className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm text-white transition hover:bg-[var(--accent-hover)]"
            >
              {previewUrl ? 'Kapak Değiştir' : 'Kapak Seç'}
            </button>
            {previewUrl ? (
              <button
                type="button"
                onClick={handleRemoveCover}
                className="rounded-lg border border-[var(--danger-border)] bg-[var(--danger-surface-soft)] px-4 py-2 text-sm text-[var(--text-primary)] transition hover:border-[var(--danger-strong)]"
              >
                Kapağı Kaldır
              </button>
            ) : null}
          </div>
        </div>

        <div className="flex justify-end lg:col-span-2">
          <button
            type="submit"
            className="rounded-lg bg-[var(--accent)] px-5 py-2.5 text-sm text-white transition hover:bg-[var(--accent-hover)]"
          >
            {book ? 'Değişiklikleri Kaydet' : 'Cildi Kaydet'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
