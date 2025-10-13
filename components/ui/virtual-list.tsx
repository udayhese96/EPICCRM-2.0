'use client'

import { useVirtualizer } from '@tanstack/react-virtual'
import { useRef } from 'react'

interface VirtualListProps<T> {
  items: T[]
  renderItem: (item: T, index: number) => React.ReactNode
  itemHeight?: number
  containerHeight?: number
  className?: string
}

export function VirtualList<T>({ 
  items, 
  renderItem, 
  itemHeight = 80, 
  containerHeight = 600,
  className = ''
}: VirtualListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => itemHeight,
  })

  return (
    <div
      ref={parentRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            {renderItem(items[virtualItem.index], virtualItem.index)}
          </div>
        ))}
      </div>
    </div>
  )
}


