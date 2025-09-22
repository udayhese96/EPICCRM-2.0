"use client"

import { memo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { User, Phone, Mail, MapPin, Building, Calendar } from "lucide-react"

interface Lead {
  id: string
  uid: string
  customer_name: string
  customer_mobile_number: string
  source: string
  campaign: string
  date: string
  lead_status: string
  lead_category?: string
  customer_email?: string
  customer_location?: string
}

interface LeadFormHeaderProps {
  lead: Lead
}

export const LeadFormHeader = memo(function LeadFormHeader({ lead }: LeadFormHeaderProps) {
  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center space-x-2">
          <User className="h-5 w-5 text-blue-600" />
          <span>Customer Information</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="flex items-center space-x-2">
            <User className="h-4 w-4 text-gray-500" />
            <span className="font-medium">Name:</span>
            <span>{lead.customer_name}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Phone className="h-4 w-4 text-gray-500" />
            <span className="font-medium">Phone:</span>
            <span>{lead.customer_mobile_number}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Building className="h-4 w-4 text-gray-500" />
            <span className="font-medium">Source:</span>
            <Badge variant="outline">{lead.source}</Badge>
          </div>
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <span className="font-medium">Date:</span>
            <span>{lead.date}</span>
          </div>
          <div className="flex items-center space-x-2">
            <MapPin className="h-4 w-4 text-gray-500" />
            <span className="font-medium">Campaign:</span>
            <span>{lead.campaign}</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="font-medium">UID:</span>
            <Badge variant="secondary">{lead.uid}</Badge>
          </div>
        </div>

        {/* Previous Calls - placed right below customer info for visibility */}
        <div className="rounded-md bg-gradient-to-r from-blue-50 to-indigo-50 p-4 border">
          <div className="text-sm font-semibold text-blue-900 mb-1">Previous Calls</div>
          <div className="text-sm text-gray-800 space-y-1">
            <div>Qualified: <span className="font-medium">{(lead.first_call_date || '').slice(0,10) || '-'}</span> · {lead.lead_remark || lead.remarks || '—'}</div>
            {lead.second_remark && (
              <div>Follow Up 1: <span className="font-medium">{(lead.second_call_date || '').slice(0,10)}</span> · {lead.second_remark}</div>
            )}
            {lead.third_remark && (
              <div>Follow Up 2: <span className="font-medium">{(lead.third_call_date || '').slice(0,10)}</span> · {lead.third_remark}</div>
            )}
            {lead.fourth_remark && (
              <div>Follow Up 3: <span className="font-medium">{(lead.fourth_call_date || '').slice(0,10)}</span> · {lead.fourth_remark}</div>
            )}
            {lead.fifth_remark && (
              <div>Follow Up 4: <span className="font-medium">{(lead.fifth_call_date || '').slice(0,10)}</span> · {lead.fifth_remark}</div>
            )}
            {lead.sixth_remark && (
              <div>Follow Up 5: <span className="font-medium">{(lead.sixth_call_date || '').slice(0,10)}</span> · {lead.sixth_remark}</div>
            )}
          </div>
        </div>

        {/* Qualification Summary (if present) */}
        {(lead.model_interested || lead.branch || lead.ps_assigned || lead.lead_category) && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2 border-t">
            {lead.model_interested && (
              <div className="flex items-center space-x-2">
                <Building className="h-4 w-4 text-gray-500" />
                <span className="font-medium">Model:</span>
                <span>{lead.model_interested}</span>
              </div>
            )}
            {lead.variant && (
              <div className="flex items-center space-x-2">
                <Building className="h-4 w-4 text-gray-500" />
                <span className="font-medium">Variant:</span>
                <span>{lead.variant}</span>
              </div>
            )}
            {lead.branch && (
              <div className="flex items-center space-x-2">
                <Building className="h-4 w-4 text-gray-500" />
                <span className="font-medium">Branch:</span>
                <span>{lead.branch}</span>
              </div>
            )}
            {lead.ps_assigned && (
              <div className="flex items-center space-x-2">
                <Building className="h-4 w-4 text-gray-500" />
                <span className="font-medium">PS:</span>
                <span>{lead.ps_assigned}</span>
              </div>
            )}
            {lead.lead_category && (
              <div className="flex items-center space-x-2">
                <Badge variant="outline">{lead.lead_category}</Badge>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
})

