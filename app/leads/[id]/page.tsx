import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import Link from "next/link"
import { ArrowLeft, Edit, Phone, Mail, Building, Calendar, DollarSign, User, MapPin } from "lucide-react"
import { LeadActivities } from "@/components/leads/lead-activities"

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: currentUser } = await supabase.auth.getUser()
  if (!currentUser?.user) redirect("/auth/login")

  // Get lead details
  const { data: lead } = await supabase
    .from("leads")
    .select(`
      *,
      profiles!leads_assigned_to_fkey (
        first_name,
        last_name,
        email
      ),
      branches (
        name,
        code
      ),
      created_by_profile:profiles!leads_created_by_fkey (
        first_name,
        last_name
      )
    `)
    .eq("id", id)
    .single()

  if (!lead) {
    redirect("/leads")
  }

  // Get lead activities
  const { data: activities } = await supabase
    .from("lead_activities")
    .select(`
      *,
      profiles (
        first_name,
        last_name
      )
    `)
    .eq("lead_id", id)
    .order("created_at", { ascending: false })

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new":
        return "bg-blue-100 text-blue-800"
      case "contacted":
        return "bg-yellow-100 text-yellow-800"
      case "qualified":
        return "bg-green-100 text-green-800"
      case "proposal_sent":
        return "bg-purple-100 text-purple-800"
      case "negotiation":
        return "bg-orange-100 text-orange-800"
      case "closed_won":
        return "bg-emerald-100 text-emerald-800"
      case "closed_lost":
        return "bg-red-100 text-red-800"
      case "on_hold":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-800"
      case "high":
        return "bg-orange-100 text-orange-800"
      case "medium":
        return "bg-yellow-100 text-yellow-800"
      case "low":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="sm" asChild>
              <Link href="/leads">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Leads
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {lead.first_name} {lead.last_name}
              </h1>
              <p className="text-gray-600">{lead.company}</p>
            </div>
          </div>
          <Button asChild>
            <Link href={`/leads/${id}/edit`}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Lead
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lead Information */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Lead Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Name</p>
                      <p className="font-medium">
                        {lead.first_name} {lead.last_name}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Building className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Company</p>
                      <p className="font-medium">{lead.company || "—"}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <p className="font-medium">{lead.email || "—"}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Phone</p>
                      <p className="font-medium">{lead.phone}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Job Title</p>
                    <p className="font-medium">{lead.job_title || "—"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Source</p>
                    <p className="font-medium capitalize">{lead.source.replace("_", " ")}</p>
                  </div>
                </div>

                <Separator />

                <div>
                  <p className="text-sm text-gray-500 mb-2">Description</p>
                  <p className="text-gray-900">{lead.description || "No description provided."}</p>
                </div>

                {lead.notes && (
                  <div>
                    <p className="text-sm text-gray-500 mb-2">Notes</p>
                    <p className="text-gray-900">{lead.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Activities */}
            <LeadActivities leadId={id} activities={activities || []} />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Lead Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500 mb-2">Status</p>
                  <Badge className={getStatusColor(lead.status)}>{lead.status.replace("_", " ").toUpperCase()}</Badge>
                </div>

                <div>
                  <p className="text-sm text-gray-500 mb-2">Priority</p>
                  <Badge className={getPriorityColor(lead.priority)}>{lead.priority.toUpperCase()}</Badge>
                </div>

                <Separator />

                <div className="flex items-center space-x-2">
                  <DollarSign className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Estimated Value</p>
                    <p className="font-medium">{lead.value ? `$${lead.value.toLocaleString()}` : "—"}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Expected Close</p>
                    <p className="font-medium">
                      {lead.expected_close_date ? new Date(lead.expected_close_date).toLocaleDateString() : "—"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Assignment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500 mb-2">Assigned To</p>
                  <p className="font-medium">
                    {lead.profiles ? `${lead.profiles.first_name} ${lead.profiles.last_name}` : "Unassigned"}
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Branch</p>
                    <p className="font-medium">
                      {lead.branches ? `${lead.branches.name} (${lead.branches.code})` : "No Branch"}
                    </p>
                  </div>
                </div>

                <Separator />

                <div>
                  <p className="text-sm text-gray-500 mb-2">Created By</p>
                  <p className="font-medium">
                    {lead.created_by_profile
                      ? `${lead.created_by_profile.first_name} ${lead.created_by_profile.last_name}`
                      : "Unknown"}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-500 mb-2">Created Date</p>
                  <p className="font-medium">{new Date(lead.created_at).toLocaleDateString()}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
