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

export default function PageGrid({ 
  pages, 
  onViewImage,
  onUpload,
  onDelete,
  onRotate,
  onTogglePdf,
  onReveal,
  onEditNote,
  pdfItems,
  virtuosoRef
}) {
  return (
    <VirtuosoGrid
      ref={virtuosoRef}
      useWindowScroll
      data={pages}
      components={gridComponents}
      itemContent={(index, page) => {
        const isPdfSelected = pdfItems.some(item => item.pageId === page.id);
        return (
          <PageCard 
            page={page} 
            onViewImage={onViewImage} 
            onUpload={onUpload}
            onDelete={onDelete}
            onRotate={onRotate}
            onTogglePdf={onTogglePdf}
            onReveal={onReveal}
            onEditNote={onEditNote}
            isPdfSelected={isPdfSelected}
          />
        )
      }}
    />
  )
}
