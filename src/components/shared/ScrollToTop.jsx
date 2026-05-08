import { useEffect, useState } from 'react'

export default function ScrollToTop() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 300)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Başa dön"
      className={`fixed bottom-6 right-6 z-[9999] flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-primary)] shadow-[var(--shadow-soft)] backdrop-blur-sm transition-all duration-300 hover:border-[var(--accent)] hover:text-[var(--accent)] hover:shadow-[0_0_24px_rgba(79,142,247,0.25)] ${
        visible
          ? 'translate-y-0 opacity-100 pointer-events-auto'
          : 'translate-y-12 opacity-0 pointer-events-none'
      }`}
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
        <path d="M12 19V5M5 12l7-7 7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  )
}
