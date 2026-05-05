import PageCard from './PageCard.jsx'

export default function PageGrid({ pages, onSelect }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {pages.map((page) => (
        <PageCard key={page.id} page={page} onSelect={onSelect} />
      ))}
    </div>
  )
}
