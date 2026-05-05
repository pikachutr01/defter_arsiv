import { useState } from 'react'
import { ipc } from '../utils/ipc.js'

export default function PdfExport() {
  const [selections, setSelections] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  const handleGenerate = async () => {
    setIsLoading(true)
    await ipc.pdfGenerate(selections)
    setIsLoading(false)
  }

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl">PDF Derleme</h2>
        <p className="text-sm text-[var(--text-muted)]">
          Sayfaları seçip PDF olarak dışarı aktar.
        </p>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 text-sm text-[var(--text-muted)]">
        Bu bölümde seçim listesi, önizleme ve sürükle bırak sıralama olacak.
      </div>

      <button
        type="button"
        onClick={handleGenerate}
        disabled={isLoading}
        className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm text-white"
      >
        {isLoading ? 'PDF hazırlanıyor...' : 'PDF Oluştur'}
      </button>
    </section>
  )
}
