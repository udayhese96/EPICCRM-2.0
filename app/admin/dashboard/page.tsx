"use client"

import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { logout } from "@/lib/auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  Upload, 
  UserPlus, 
  Edit, 
  Download, 
  Users, 
  Copy, 
  ArrowRightLeft,
  BarChart3,
  Building2,
  LogOut,
  Zap,
  Loader2
} from "lucide-react"
import { useState } from "react"

export default function AdminDashboard() {
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)
  const [loadingCard, setLoadingCard] = useState<string | null>(null)

  const QuickCard = ({
    title,
    desc,
    icon: Icon,
    accent = "blue",
    onClick,
    cardId
  }: {
    title: string
    desc: string
    icon: any
    accent?: "blue" | "green" | "purple" | "indigo" | "teal" | "pink" | "orange" | "red" | "cyan" | "gray"
    onClick?: () => void
    cardId?: string
  }) => {
    const palettes: Record<string, { icon: string; grad: string; spinner: string }> = {
      blue: { icon: "text-blue-600", grad: "from-blue-50 to-blue-100", spinner: "border-blue-600" },
      green: { icon: "text-green-600", grad: "from-green-50 to-green-100", spinner: "border-green-600" },
      purple: { icon: "text-purple-600", grad: "from-purple-50 to-purple-100", spinner: "border-purple-600" },
      indigo: { icon: "text-indigo-600", grad: "from-indigo-50 to-indigo-100", spinner: "border-indigo-600" },
      teal: { icon: "text-teal-600", grad: "from-teal-50 to-teal-100", spinner: "border-teal-600" },
      pink: { icon: "text-pink-600", grad: "from-pink-50 to-pink-100", spinner: "border-pink-600" },
      orange: { icon: "text-orange-600", grad: "from-orange-50 to-orange-100", spinner: "border-orange-600" },
      red: { icon: "text-red-600", grad: "from-red-50 to-red-100", spinner: "border-red-600" },
      cyan: { icon: "text-cyan-600", grad: "from-cyan-50 to-cyan-100", spinner: "border-cyan-600" },
      gray: { icon: "text-gray-600", grad: "from-gray-50 to-gray-100", spinner: "border-gray-600" },
    }
    const p = palettes[accent]
    const isLoading = cardId && loadingCard === cardId

    const handleClick = async () => {
      if (!onClick || isLoading) return
      
      if (cardId) {
        setLoadingCard(cardId)
        // Simulate loading with a beautiful animation
        await new Promise(resolve => setTimeout(resolve, 600))
      }
      
      onClick()
    }

    return (
      <Card
        onClick={handleClick}
        className={`rounded-3xl bg-white/80 backdrop-blur-md border border-white/60 shadow-[0_10px_30px_rgba(16,24,40,0.06)] hover:shadow-[0_16px_40px_rgba(16,24,40,0.10)] transition-all duration-300 cursor-pointer group relative overflow-hidden ${isLoading ? 'pointer-events-none' : ''}`}
      >
        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-10 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <div className={`w-8 h-8 border-3 ${p.spinner} border-t-transparent rounded-full animate-spin`} />
              <span className={`text-xs font-medium ${p.icon}`}>Loading...</span>
            </div>
          </div>
        )}
        
        <CardHeader className="pb-2">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-2xl bg-gradient-to-br ${p.grad} group-hover:scale-105 transition-transform ${isLoading ? 'scale-105 animate-pulse' : ''}`}>
              {isLoading ? (
                <Loader2 className={`h-5 w-5 ${p.icon} animate-spin`} />
              ) : (
                <Icon className={`h-5 w-5 ${p.icon}`} />
              )}
            </div>
            <CardTitle className="text-sm font-semibold text-gray-900">{title}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <CardDescription className="text-xs text-gray-600">{desc}</CardDescription>
        </CardContent>
      </Card>
    )
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-100/30 relative overflow-hidden">
        {/* subtle decor */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-8 -right-10 w-64 h-64 bg-gradient-to-br from-orange-100/30 to-orange-200/30 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-10 w-40 h-40 bg-gradient-to-tr from-orange-100/25 to-orange-200/25 rounded-full blur-2xl" />
        </div>

        <div className="relative z-10 space-y-8">
          {/* Header */}
          <div className="rounded-3xl overflow-hidden shadow-xl border border-white/50 bg-white/70 backdrop-blur-md">
            <div
              className="bg-gradient-to-r from-orange-500/90 via-orange-600/80 to-orange-700/70 px-6 md:px-8 py-6"
              style={{
                background:
                  "linear-gradient(135deg, rgba(234,88,12,0.9) 0%, rgba(251,146,60,0.85) 50%, rgba(254,215,170,0.8) 100%)",
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                    <Zap className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
                    <p className="text-orange-100 font-medium">Manage CRM configuration, users, and analytics</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="hidden md:flex items-center gap-2 bg-white/10 px-3 py-2 rounded-2xl border border-white/20">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-xs text-white/90 font-medium">System Online</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      setLoggingOut(true)
                      try {
                        // Perform actual logout
                        logout()
                      } catch (error) {
                        console.error('Logout error:', error)
                        setLoggingOut(false)
                      }
                    }}
                    className="rounded-2xl bg-white/10 hover:bg-white/20 text-white border border-white/30"
                  >
                    {loggingOut ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <LogOut className="h-4 w-4 mr-2" />}
                    Logout
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Lead Management */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">Lead management</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <QuickCard
                cardId="upload-data"
                title="Upload Data"
                desc="Import leads and customer data"
                icon={Upload}
                accent="red"
                onClick={() => router.push("/admin/upload-data")}
              />
              <QuickCard
                cardId="assign-leads"
                title="Assign Leads"
                desc="Distribute leads to team members"
                icon={UserPlus}
                accent="orange"
                onClick={() => router.push("/admin/assign-leads")}
              />
              <QuickCard
                cardId="manage-leads"
                title="Manage Leads"
                desc="View and edit lead information"
                icon={Edit}
                accent="green"
              />
              <QuickCard
                cardId="export-leads"
                title="Export Leads"
                desc="Download lead data and reports"
                icon={Download}
                accent="blue"
                onClick={() => router.push("/admin/export-leads")}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <QuickCard
                cardId="duplicate-leads"
                title="Duplicate Leads"
                desc="Identify and manage duplicate entries"
                icon={Copy}
                accent="pink"
              />
              <QuickCard
                cardId="lead-transfer"
                title="Lead Transfer"
                desc="Transfer leads between team members"
                icon={ArrowRightLeft}
                accent="indigo"
                onClick={() => router.push("/admin/lead-transfer")}
              />
            </div>
          </section>

          {/* User Management */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-green-600" />
              <h2 className="text-xl font-semibold text-gray-900">User management</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <QuickCard
                cardId="manage-cre"
                title="Manage CREs"
                desc="Configure Customer Relationship Executives"
                icon={Users}
                accent="blue"
                onClick={() => router.push("/admin/manage-cre")}
              />
              <QuickCard
                cardId="manage-ps"
                title="Manage PS"
                desc="Configure Product Specialists"
                icon={UserPlus}
                accent="green"
                onClick={() => router.push("/admin/manage-ps")}
              />
              <QuickCard
                cardId="manage-cre-tl"
                title="Manage CRE TL"
                desc="Configure CRE Team Leaders"
                icon={Users}
                accent="purple"
                onClick={() => router.push("/admin/manage-cre-team-leader")}
              />
              <QuickCard
                cardId="manage-cre-icrop"
                title="Manage CRE ICROP"
                desc="Configure CRE ICROP Users"
                icon={Building2}
                accent="indigo"
                onClick={() => router.push("/admin/manage-cre-icrop")}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <QuickCard
                cardId="manage-sales-manager"
                title="Manage Sales Manager"
                desc="Configure Sales Managers"
                icon={Users}
                accent="orange"
                onClick={() => router.push("/admin/manage-sales-manager")}
              />
              <QuickCard
                cardId="manage-team-leaders"
                title="Manage Team Leaders"
                desc="Configure Team Leaders and PS assignments"
                icon={Users}
                accent="cyan"
                onClick={() => router.push("/admin/manage-team-leaders")}
              />
              <QuickCard
                cardId="all-users"
                title="All Users"
                desc="View and manage all users"
                icon={Users}
                accent="gray"
                onClick={() => router.push("/admin/users")}
              />
              <QuickCard
                cardId="manage-branches"
                title="Manage Branches"
                desc="Configure branch locations"
                icon={Building2}
                accent="teal"
                onClick={() => router.push("/admin/branches")}
              />
            </div>
          </section>

          {/* Analytics & Reports */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-purple-600" />
              <h2 className="text-xl font-semibold text-gray-900">Analytics & reports</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <QuickCard
                cardId="view-analytics"
                title="View Analytics"
                desc="Comprehensive system analytics"
                icon={BarChart3}
                accent="blue"
                onClick={() => router.push("/admin/analytics")}
              />
            </div>
          </section>
        </div>
      </div>
    </DashboardLayout>
  )
}
