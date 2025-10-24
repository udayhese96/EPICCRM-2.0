/**
 * TabsBar Component
 * 
 * Usage:
 * ```tsx
 * <TabsBar
 *   activeKey="todaysFollowups"
 *   onChange={(key) => setActiveKey(key)}
 *   counts={{ todaysFollowups: 7, freshLeads: 12 }}
 * />
 * ```
 */

"use client"

import { useState, useRef, useEffect } from 'react'
import { 
  BarChart3, 
  Calendar, 
  Target, 
  Sparkles, 
  CheckCircle2, 
  XCircle, 
  Download
} from 'lucide-react'
import { tabLabels, tabIcons } from '@/lib/tabLabels'

interface TabsBarProps {
  activeKey: string
  onChange: (key: string) => void
  counts?: Record<string, number>
}

const iconMap = {
  BarChart3,
  Calendar,
  Target,
  Sparkles,
  CheckCircle2,
  XCircle,
  Download
}

const tabs = [
  { id: 'analytics', label: 'Analytics' },
  { id: 'todaysFollowups', label: "Today's Follow-ups" },
  { id: 'allLeads', label: 'All Leads' },
  { id: 'freshLeads', label: 'Fresh Leads' },
  { id: 'wonLeads', label: 'Won Leads' },
  { id: 'lostLeads', label: 'Lost Leads' },
  { id: 'exportLeads', label: 'Export Leads' }
]

export default function TabsBar({ activeKey, onChange, counts = {} }: TabsBarProps) {
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])

  const handleKeyDown = (event: React.KeyboardEvent, index: number) => {
    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault()
        const prevIndex = index > 0 ? index - 1 : tabs.length - 1
        tabRefs.current[prevIndex]?.focus()
        setFocusedIndex(prevIndex)
        break
      case 'ArrowRight':
        event.preventDefault()
        const nextIndex = index < tabs.length - 1 ? index + 1 : 0
        tabRefs.current[nextIndex]?.focus()
        setFocusedIndex(nextIndex)
        break
      case 'Enter':
      case ' ':
        event.preventDefault()
        onChange(tabs[index].id)
        break
    }
  }

  const handleTabClick = (tabId: string) => {
    onChange(tabId)
  }

  const getIcon = (tabId: string) => {
    const iconName = tabIcons[tabId] as keyof typeof iconMap
    const IconComponent = iconMap[iconName]
    return IconComponent ? <IconComponent className="h-4 w-4" /> : null
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm p-3 border border-slate-200 dark:border-slate-700">
      <div 
        role="tablist" 
        className="flex flex-wrap gap-2"
      >
        {tabs.map((tab, index) => {
          const isActive = activeKey === tab.id
          const count = counts[tab.id]
          
          return (
            <button
              key={tab.id}
              ref={(el) => (tabRefs.current[index] = el)}
              role="tab"
              aria-selected={isActive}
              aria-controls={`${tab.id}-panel`}
              tabIndex={isActive ? 0 : -1}
              className={`
                inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200
                focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
                whitespace-nowrap break-keep
                ${isActive 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }
                ${focusedIndex === index ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
              `}
              onClick={() => handleTabClick(tab.id)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              onFocus={() => setFocusedIndex(index)}
              onBlur={() => setFocusedIndex(-1)}
            >
              {getIcon(tab.id)}
              <span className="whitespace-nowrap">{tab.label}</span>
              {count !== undefined && count > 0 && (
                <span 
                  className={`
                    text-xs rounded-full px-2 py-0.5 font-medium
                    ${isActive 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                    }
                  `}
                >
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
