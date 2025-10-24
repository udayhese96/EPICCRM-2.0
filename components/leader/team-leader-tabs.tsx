"use client"

import { useState, useCallback, memo } from 'react'
import { tabLabels, tabOrder } from '@/lib/tabLabels'
import {
  BarChart3,
  Sparkles,
  Calendar,
  FolderOpen,
  Clock,
  CheckCircle2,
  Award,
  Download,
  Inbox
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface TeamLeaderTabsProps {
  defaultTab?: string
  onTabChange?: (tab: string) => void
  analyticsContent: React.ReactNode
  freshLeadsContent?: React.ReactNode
  todaysFollowUpContent?: React.ReactNode
  openLeadsContent?: React.ReactNode
  waitingForApprovalContent?: React.ReactNode
  bookedContent?: React.ReactNode
  retailedContent?: React.ReactNode
  exportLeadsContent?: React.ReactNode
}

// Icon mapping
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  analytics: BarChart3,
  freshLeads: Sparkles,
  todaysFollowUp: Calendar,
  openLeads: FolderOpen,
  waitingForApproval: Clock,
  booked: CheckCircle2,
  retailed: Award,
  exportLeads: Download
}

export function TeamLeaderTabs({
  defaultTab = 'analytics',
  onTabChange,
  analyticsContent,
  freshLeadsContent,
  todaysFollowUpContent,
  openLeadsContent,
  waitingForApprovalContent,
  bookedContent,
  retailedContent,
  exportLeadsContent
}: TeamLeaderTabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab)

  const handleTabClick = useCallback((tabId: string) => {
    setActiveTab(tabId)
    onTabChange?.(tabId)
  }, [onTabChange])

  // Render appropriate content based on active tab
  // Using useMemo would be overkill here since we're just doing a switch
  const renderTabContent = useCallback(() => {
    switch (activeTab) {
      case 'analytics':
        return analyticsContent
      case 'freshLeads':
        return freshLeadsContent || <EmptyState tabName={tabLabels[activeTab]} />
      case 'todaysFollowUp':
        return todaysFollowUpContent || <EmptyState tabName={tabLabels[activeTab]} />
      case 'openLeads':
        return openLeadsContent || <EmptyState tabName={tabLabels[activeTab]} />
      case 'waitingForApproval':
        return waitingForApprovalContent || <EmptyState tabName={tabLabels[activeTab]} />
      case 'booked':
        return bookedContent || <EmptyState tabName={tabLabels[activeTab]} />
      case 'retailed':
        return retailedContent || <EmptyState tabName={tabLabels[activeTab]} />
      case 'exportLeads':
        return exportLeadsContent || <EmptyState tabName={tabLabels[activeTab]} />
      default:
        return <EmptyState tabName={tabLabels[activeTab]} />
    }
  }, [
    activeTab,
    analyticsContent,
    freshLeadsContent,
    todaysFollowUpContent,
    openLeadsContent,
    waitingForApprovalContent,
    bookedContent,
    retailedContent,
    exportLeadsContent,
  ])

  return (
    <div className="space-y-4">
      {/* Horizontal Tab Bar - Sticky with Multi-line Wrapping */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 -mx-6 px-6 shadow-sm">
        <div className="flex flex-wrap gap-2 py-4">
          {tabOrder.map((tabId) => {
            const Icon = iconMap[tabId]
            const isActive = activeTab === tabId

            return (
              <button
                key={tabId}
                onClick={() => handleTabClick(tabId)}
                className={cn(
                  "flex items-center space-x-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-all duration-200",
                  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                  "min-w-fit",
                  isActive
                    ? "bg-blue-600 text-white shadow-md shadow-blue-200 hover:bg-blue-700"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-sm"
                )}
              >
                {Icon && <Icon className="h-4 w-4 flex-shrink-0" />}
                <span className="whitespace-nowrap">{tabLabels[tabId]}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Tab Content Area */}
      <div className="transition-all duration-300 ease-in-out animate-in fade-in duration-300">
        {renderTabContent()}
      </div>
    </div>
  )
}

// Empty State Component for non-analytics tabs
function EmptyState({ tabName }: { tabName: string }) {
  return (
    <div className="flex items-center justify-center min-h-[500px]">
      <div className="text-center space-y-4 max-w-md mx-auto px-6">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
          <Inbox className="h-10 w-10 text-gray-400" />
        </div>
        <h3 className="text-xl font-semibold text-gray-700">
          No Data Available
        </h3>
        <p className="text-gray-500 text-sm">
          {tabName} data will be displayed here once available.
        </p>
        <div className="pt-4">
          <div className="inline-flex items-center justify-center w-full">
            <div className="w-32 h-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent rounded-full"></div>
          </div>
        </div>
      </div>
    </div>
  )
}
