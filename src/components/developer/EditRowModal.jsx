import { useState, useEffect, useCallback } from 'react'
import Modal from '../shared/Modal.jsx'

// ─── Constants ───────────────────────────────────────────────────────────────

const READ_ONLY_FIELDS = new Set(['id', 'key', 'created_at', 'updated_at', 'book_id'])

const TABLE_LABELS = { books: 'Cilt', pages: 'Sayfa', settings: 'Ayar' }

// ─── Component ───────────────────────────────────────────────────────────────

export default function EditRowModal({ table, row, onClose, onSave }) {
  const [formData, setFormData] = useState({})

  useEffect(() => {
    if (row) setFormData({ ...row })
  }, [row])

  const handleChange = useCallback((field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }, [])

  const handleSubmit = (e) => {
    e.preventDefault()

    const updates = {}
    for (const key in formData) {
      if (!READ_ONLY_FIELDS.has(key) && formData[key] !== row[key]) {
        updates[key] = formData[key] === '' ? null : formData[key]
      }
    }

    if (Object.keys(updates).length > 0) {
      onSave(updates)
    } else {
      onClose()
    }
  }

  return (
    <Modal
      title={`${TABLE_LABELS[table] ?? table} Düzenle`}
      onClose={onClose}
      panelClassName="max-w-[500px]"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="max-h-[60vh] overflow-auto px-1 flex flex-col gap-3">
          {Object.keys(formData).map((field) => {
            const isReadOnly = READ_ONLY_FIELDS.has(field)
            const value = formData[field] === null ? '' : formData[field]

            return (
              <div key={field} className="flex flex-col gap-1">
                <label className="text-sm font-medium text-[var(--text-secondary)]">
                  {field}
                </label>
                {isReadOnly ? (
                  <div className="p-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded text-sm text-[var(--text-muted)] cursor-not-allowed overflow-hidden text-ellipsis">
                    {String(formData[field] ?? 'NULL')}
                  </div>
                ) : (
                  <textarea
                    value={value}
                    onChange={(e) => handleChange(field, e.target.value)}
                    className="p-2 bg-[var(--bg-input)] border border-[var(--border)] rounded text-sm min-h-[40px] focus:outline-none focus:border-[var(--accent)]"
                    rows={String(value).length > 50 ? 3 : 1}
                  />
                )}
              </div>
            )
          })}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-[var(--border)]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded text-sm font-medium hover:bg-[var(--bg-elevated)] transition"
          >
            İptal
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90 transition"
          >
            Kaydet
          </button>
        </div>
      </form>
    </Modal>
  )
}