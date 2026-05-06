import React from 'react'
import { VirtuosoGrid } from 'react-virtuoso'
import PageCard from './PageCard.jsx'

const gridComponents = {
  List: React.forwardRef((props, ref) => (
    <div {...props} ref={ref} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" />
  )),
  Item: React.forwardRef((props, ref) => (
    <div {...props} ref={ref} className="h-full" />
  ))
}

export default function PageGrid({ pages, onSelect, onViewImage }) {
  return (
    <VirtuosoGrid
      useWindowScroll
      data={pages}
      components={gridComponents}
      itemContent={(index, page) => (
        <PageCard page={page} onSelect={onSelect} onViewImage={onViewImage} />
      )}
    />
  )
}
