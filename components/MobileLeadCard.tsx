import React, { useState } from 'react'
import { Phone, ChevronDown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { UpdateButton } from './UpdateButton'

interface MobileLeadCardProps {
  item: any
  index: number
  isQualifiedLead: boolean
  onUpdate: (item: any) => void
  getStatusBadge: (status: string, item?: any) => React.ReactNode
  getNextCallNumber: (item: any) => number
  formatDate: (date: string) => string
}

export const MobileLeadCard: React.FC<MobileLeadCardProps> = ({
  item,
  index,
  isQualifiedLead,
  onUpdate,
  getStatusBadge,
  getNextCallNumber,
  formatDate
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  
  const customerName = isQualifiedLead ? item.customer_name : item.customer_name
  const customerMobile = isQualifiedLead ? item.customer_mobile_number : item.customer_mobile_number
  const leadUid = isQualifiedLead ? item.lead_uid : item.lead_uid
  const assignedDate = isQualifiedLead ? item.created_at : item.ps_assigned_at
  
  // Alternating row background colors
  const rowBgClass = index % 6 === 0 ? 'bg-mint-50/50' : 
                    index % 6 === 1 ? 'bg-cream-50/50' : 
                    index % 6 === 2 ? 'bg-blush-50/50' : 
                    index % 6 === 3 ? 'bg-sky-50/50' : 
                    index % 6 === 4 ? 'bg-lavender-50/50' : 
                    'bg-sage-50/50'
  
  return (
    <div className={`${rowBgClass} rounded-xl p-4 mb-3 border border-gray-200/50 shadow-sm hover:shadow-md transition-all duration-200`}>
      {/* Main Info Row */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-gray-900 text-base truncate">{customerName}</h3>
            {getStatusBadge(item.final_status, item)}
          </div>
          <div className="flex items-center gap-1 text-sm text-gray-600 mb-1">
            <Phone className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{customerMobile}</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-amber-100 text-amber-800 text-xs px-2 py-1">
              {leadUid}
            </Badge>
            {item.icrop_id && (
              <Badge variant="outline" className="bg-teal-100 text-teal-800 text-xs px-2 py-1">
                {item.icrop_id}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 ml-3">
          <UpdateButton 
            onClick={() => onUpdate(item)} 
            className="w-full sm:w-auto"
            size="sm"
          />
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-gray-500 hover:text-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded"
            aria-label={isExpanded ? "Collapse details" : "Expand details"}
          >
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>
      
      {/* Expanded Details */}
      {isExpanded && (
        <div className="pt-3 border-t border-gray-200/50 space-y-3">
          {/* Vehicle Details */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Vehicle Details</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-600">Model:</span>
                <span className="ml-1 font-medium">{item.model_interested || '—'}</span>
              </div>
              <div>
                <span className="text-gray-600">Variant:</span>
                <span className="ml-1 font-medium">{item.variant || '—'}</span>
              </div>
              <div>
                <span className="text-gray-600">Plan:</span>
                <span className="ml-1 font-medium">{item.buying_plan || '—'}</span>
              </div>
              <div>
                <span className="text-gray-600">Finance:</span>
                <span className="ml-1 font-medium">{item.finance_option || '—'}</span>
              </div>
            </div>
          </div>
          
          {/* Next Call Info */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Next Call</h4>
            <div className="text-sm">
              <span className="text-gray-600">Call #{getNextCallNumber(item)}</span>
              <div className="text-gray-500 mt-1">{formatDate(item.follow_up_date)}</div>
            </div>
          </div>
          
          {/* Additional Info */}
          <div className="text-xs text-gray-500">
            Assigned: {formatDate(assignedDate)}
          </div>
        </div>
      )}
    </div>
  )
}

export default MobileLeadCard
