export default function SearchBar({ value, onChange, onKeyDown, placeholder }) {
  return (
    <label className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 cursor-text focus-within:border-[var(--accent)] transition">
      <span className="text-sm text-[var(--text-muted)]">Ara</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className="flex-1 bg-transparent text-sm text-[var(--text-primary)] outline-none w-full"
      />
    </label>
  )
}
