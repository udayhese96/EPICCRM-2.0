import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get sample qualified leads to see what final_status values exist
    const { data: qualifiedLeads, error } = await supabase
      .from('qualified_leads')
      .select('id, final_status, booking_status, retailed_status, cre_name, source')
      .limit(20)

    if (error) {
      console.error('Error fetching qualified leads:', error)
      return NextResponse.json({ error: 'Failed to fetch qualified leads', details: error }, { status: 500 })
    }

    // Get unique final_status values
    const uniqueStatuses = [...new Set(qualifiedLeads?.map(lead => lead.final_status).filter(Boolean))]
    const uniqueBookingStatuses = [...new Set(qualifiedLeads?.map(lead => lead.booking_status).filter(Boolean))]
    const uniqueRetailStatuses = [...new Set(qualifiedLeads?.map(lead => lead.retailed_status).filter(Boolean))]

    return NextResponse.json({
      sampleLeads: qualifiedLeads?.slice(0, 5),
      statusAnalysis: {
        uniqueFinalStatuses: uniqueStatuses,
        uniqueBookingStatuses: uniqueBookingStatuses,
        uniqueRetailStatuses: uniqueRetailStatuses,
        totalLeads: qualifiedLeads?.length || 0
      },
      fieldValues: {
        finalStatusCounts: uniqueStatuses.map(status => ({
          status,
          count: qualifiedLeads?.filter(lead => lead.final_status === status).length || 0
        })),
        bookingStatusCounts: uniqueBookingStatuses.map(status => ({
          status,
          count: qualifiedLeads?.filter(lead => lead.booking_status === status).length || 0
        })),
        retailStatusCounts: uniqueRetailStatuses.map(status => ({
          status,
          count: qualifiedLeads?.filter(lead => lead.retailed_status === status).length || 0
        }))
      }
    })

  } catch (error) {
    console.error('Error checking status values:', error)
    return NextResponse.json({ error: 'Internal server error', details: error }, { status: 500 })
  }
}

