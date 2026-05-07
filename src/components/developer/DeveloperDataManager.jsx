import { useEffect, useState, useCallback } from 'react'
import Modal from '../shared/Modal.jsx'
import { ipc } from '../../utils/ipc.js'
import ImageViewer from '../images/ImageViewer.jsx'
import useBookStore from '../../store/useBookStore.js'
import { useToast } from '../shared/ToastProvider.jsx'
import EditRowModal from './EditRowModal.jsx'

// ─── Constants ───────────────────────────────────────────────────────────────

const LIMIT = 50

const TABS = [
  { id: 'books', label: 'Ciltler (Books)' },
  { id: 'pages', label: 'Sayfalar (Pages)' },
  { id: 'settings', label: 'Ayarlar (Settings)' },
]

const COLUMNS = {
  books: ['id', 'name', 'total_pages', 'cover_image', 'created_at', 'updated_at'],
  pages: ['id', 'book_id', 'page_number', 'is_uploaded', 'image', 'created_at', 'updated_at'],
  settings: ['key', 'value', 'created_at', 'updated_at'],
}

const IMAGE_COLS = new Set(['cover_image', 'image'])

// ─── Sub-components ──────────────────────────────────────────────────────────

const TrashIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
)

const EditIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
)

const ImageIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
)

// ─── Component ───────────────────────────────────────────────────────────────

export default function DeveloperDataManager({ onClose }) {
  const [activeTab, setActiveTab] = useState('books')
  const [data, setData] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(false)
  const [viewingImage, setViewingImage] = useState(null)
  const [editingRow, setEditingRow] = useState(null)

  const loadBooks = useBookStore((state) => state.loadBooks)
  const { showToast } = useToast()

  const fetchData = useCallback(async () => {
    setLoading(true)
    const result = await ipc.devGetTableData({ table: activeTab, limit: LIMIT, offset: page * LIMIT })
    setLoading(false)
    if (result.success) {
      setData(result.data.rows)
      setTotal(result.data.total)
    } else {
      showToast({ variant: 'danger', title: 'Hata', message: result.error })
    }
  }, [activeTab, page, showToast])

  // Tab değişince sayfayı sıfırla
  useEffect(() => { setPage(0) }, [activeTab])
  useEffect(() => { fetchData() }, [fetchData])

  const handleDelete = async (row) => {
    if (!window.confirm(`ID: ${row.id} silinecek. Dosyalar da kalıcı olarak silinebilir. Emin misiniz?`)) return

    setLoading(true)
    const result = await (activeTab === 'books' ? ipc.booksDelete(row.id) : ipc.pagesDelete(row.id))

    if (result.success) {
      showToast({ variant: 'success', title: 'Silindi', message: 'Kayıt başarıyla silindi.' })
      if (activeTab === 'books') loadBooks()
      fetchData()
    } else {
      setLoading(false)
      showToast({ variant: 'danger', title: 'Hata', message: result.error })
    }
  }

  const handleSaveEdit = async (updates) => {
    if (!editingRow) return

    setLoading(true)
    const result = await ipc.devRawUpdate({
      table: activeTab,
      id: activeTab === 'settings' ? editingRow.key : editingRow.id,
      updates,
    })

    if (result.success) {
      showToast({ variant: 'success', title: 'Güncellendi', message: 'Kayıt güncellendi.' })
      if (activeTab === 'books') loadBooks()
      fetchData()
      setEditingRow(null)
    } else {
      setLoading(false)
      showToast({ variant: 'danger', title: 'Hata', message: result.error })
    }
  }

  const columns = COLUMNS[activeTab]
  const maxPage = Math.max(0, Math.ceil(total / LIMIT) - 1)

  return (
    <Modal
      title="Geliştirici Veri Yöneticisi"
      onClose={onClose}
      panelClassName="max-w-[95vw] max-h-[95vh] z-[9999]"
    >
      <div className="flex flex-col h-[80vh]">
        {/* Tabs */}
        <div className="flex gap-4 mb-4 border-b border-[var(--border)] pb-2">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`px-4 py-2 font-semibold transition ${activeTab === id
                  ? 'text-[var(--accent)] border-b-2 border-[var(--accent)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
            >
              {label}
            </button>
          ))}
        </div>

        <p className="text-xs text-[var(--text-muted)] mb-2">
          Düzenlemek istediğiniz verinin üstüne çift tıklayın veya Düzenle butonunu kullanın.
          Silmek için Çöp Kutusu ikonuna tıklayın. Veritabanına doğrudan (raw) müdahale
          ettiğinizi unutmayın.
        </p>

        {/* Table */}
        <div className="flex-1 overflow-auto border border-[var(--border)] rounded bg-[var(--bg-card)] relative">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-[var(--bg-card)]/80 backdrop-blur-sm z-10">
              <span className="text-[var(--accent)] font-medium">Yükleniyor...</span>
            </div>
          )}
          <table className="w-full text-sm text-left">
            <thead className="bg-[var(--bg-elevated)] sticky top-0 z-0">
              <tr>
                <th className="px-4 py-3 font-medium text-[var(--text-muted)] w-24">İşlem</th>
                {columns.map((col) => (
                  <th key={col} className="px-4 py-3 font-medium text-[var(--text-primary)]">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.length === 0 && !loading ? (
                <tr>
                  <td colSpan={columns.length + 1} className="p-8 text-center text-[var(--text-muted)]">
                    Kayıt bulunamadı.
                  </td>
                </tr>
              ) : (
                data.map((row) => (
                  <tr
                    key={row.id ?? row.key}
                    className="border-t border-[var(--border)] hover:bg-[var(--bg-elevated)] transition-colors"
                  >
                    <td className="px-4 py-2 whitespace-nowrap text-center flex items-center justify-center gap-2">
                      {activeTab !== 'settings' && (
                        <button
                          type="button"
                          onClick={() => handleDelete(row)}
                          className="text-[var(--danger-text)] transition hover:opacity-70 p-1"
                          title="Sil"
                        >
                          <TrashIcon />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setEditingRow(row)}
                        className="text-[var(--accent)] transition hover:opacity-70 p-1"
                        title="Düzenle"
                      >
                        <EditIcon />
                      </button>
                    </td>

                    {columns.map((col) => {
                      const isImage = IMAGE_COLS.has(col) && row[col]
                      return (
                        <td
                          key={col}
                          className="px-4 py-3 max-w-[200px] truncate cursor-pointer"
                          onDoubleClick={() => setEditingRow(row)}
                        >
                          {isImage ? (
                            <button
                              type="button"
                              onClick={() => setViewingImage(row[col])}
                              className="text-[var(--accent)] hover:underline flex items-center gap-1"
                            >
                              <ImageIcon />
                              Görseli Aç
                            </button>
                          ) : (
                            <span title={row[col]}>{String(row[col] ?? 'NULL')}</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-[var(--text-muted)]">Toplam Kayıt: {total}</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              className="rounded px-3 py-1 border border-[var(--border)] disabled:opacity-50 transition hover:bg-[var(--bg-elevated)]"
            >
              Önceki
            </button>
            <span className="px-3 py-1 text-sm font-semibold">
              {page + 1} / {maxPage + 1}
            </span>
            <button
              type="button"
              disabled={page >= maxPage}
              onClick={() => setPage((p) => p + 1)}
              className="rounded px-3 py-1 border border-[var(--border)] disabled:opacity-50 transition hover:bg-[var(--bg-elevated)]"
            >
              Sonraki
            </button>
          </div>
        </div>
      </div>

      {viewingImage && (
        <ImageViewer
          title="Görsel Önizleme"
          imagePath={viewingImage}
          onClose={() => setViewingImage(null)}
        />
      )}

      {editingRow && (
        <EditRowModal
          table={activeTab}
          row={editingRow}
          onClose={() => setEditingRow(null)}
          onSave={handleSaveEdit}
        />
      )}
    </Modal>
  )
}