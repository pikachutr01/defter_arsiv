import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import useSettingsStore from '../store/useSettingsStore.js'
import { ipc } from '../utils/ipc.js'
import { resolveStoredPath } from '../utils/paths.js'
import ImageUploader from '../components/images/ImageUploader.jsx'

export default function PageViewer() {
  const { pageId } = useParams()
  const numericId = Number(pageId)
  const [page, setPage] = useState(null)
  const [notes, setNotes] = useState({ a: '', b: '', page: '' })
  const storagePath = useSettingsStore((state) => state.storagePath)

  const loadPage = async () => {
    const result = await ipc.pagesGetById(numericId)
    if (result.success) {
      setPage(result.data)
      setNotes({
        a: result.data?.side_a_notes || '',
        b: result.data?.side_b_notes || '',
        page: result.data?.page_notes || '',
      })
    }
  }

  useEffect(() => {
    if (numericId) {
      loadPage()
    }
  }, [numericId])

  const handleUpload = async (side) => {
    await ipc.imagesUploadFromDialog(numericId, side)
    await loadPage()
  }

  const handleSaveNotes = async () => {
    await ipc.pagesUpdate(numericId, {
      page_notes: notes.page,
      side_a_notes: notes.a,
      side_b_notes: notes.b,
    })
    await loadPage()
  }

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl">
          Sayfa Görüntüle {page?.page_number ? `#${page.page_number}` : ''}
        </h2>
        <p className="text-sm text-[var(--text-muted)]">
          A ve B yüzlerini yan yana kontrol et.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <h3 className="text-lg">A Yüzü</h3>
          {page?.side_a_image ? (
            <img
              src={`file://${resolveStoredPath(storagePath, page.side_a_image)}`}
              alt="A yüzü"
              className="w-full rounded-2xl border border-[var(--border)]"
            />
          ) : (
            <ImageUploader label="A Yüzü Yükle" onUpload={() => handleUpload('A')} />
          )}
          <textarea
            value={notes.a}
            onChange={(event) => setNotes((prev) => ({ ...prev, a: event.target.value }))}
            rows={4}
            placeholder="A yüzü notu"
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)]"
          />
        </div>
        <div className="space-y-3">
          <h3 className="text-lg">B Yüzü</h3>
          {page?.side_b_image ? (
            <img
              src={`file://${resolveStoredPath(storagePath, page.side_b_image)}`}
              alt="B yüzü"
              className="w-full rounded-2xl border border-[var(--border)]"
            />
          ) : (
            <ImageUploader label="B Yüzü Yükle" onUpload={() => handleUpload('B')} />
          )}
          <textarea
            value={notes.b}
            onChange={(event) => setNotes((prev) => ({ ...prev, b: event.target.value }))}
            rows={4}
            placeholder="B yüzü notu"
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)]"
          />
        </div>
      </div>

      <div className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
        <h3 className="text-lg">Sayfa Notu</h3>
        <textarea
          value={notes.page}
          onChange={(event) =>
            setNotes((prev) => ({ ...prev, page: event.target.value }))
          }
          rows={4}
          placeholder="Sayfaya özel not"
          className="w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-sm text-[var(--text-primary)]"
        />
      </div>

      <button
        type="button"
        onClick={handleSaveNotes}
        className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm text-white"
      >
        Notları Kaydet
      </button>
    </section>
  )
}
