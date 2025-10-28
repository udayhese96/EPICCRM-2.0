"use client"
import type React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Menu, X, User, LogOut, ChevronRight, Home, Users, BarChart3, Settings } from "lucide-react"
import Link from "next/link"
import { FocusTrap } from "focus-trap-react"

interface DashboardLayoutFullBleedProps {
  children: React.ReactNode
}

interface User {
  id: string
  username: string
  email: string
  first_name?: string
  last_name?: string
  name?: string
  role: string
  is_active?: boolean
  branch_id?: string
}

export function DashboardLayoutFullBleed({ children }: DashboardLayoutFullBleedProps) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const checkAuth = () => {
      try {
        // Check for session in localStorage
        const manualSession = localStorage.getItem("supabase_user")
        if (manualSession) {
          const userData = JSON.parse(manualSession)
          setUser(userData)
        } else {
          router.push("/auth/login")
          return
        }
      } catch (error) {
        console.error("Auth check error:", error)
        router.push("/auth/login")
        return
      }

      setLoading(false)
    }

    checkAuth()
  }, [router])

  // Close sidebar on ESC key
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSidebarOpen(false)
      }
    }

    document.addEventListener('keydown', handleEscapeKey)
    return () => {
      document.removeEventListener('keydown', handleEscapeKey)
    }
  }, [])

  const handleSignOut = () => {
    localStorage.removeItem('supabase_user')
    localStorage.removeItem('user')
    router.push('/auth/login')
  }

  const getNavigationItems = () => {
    const roleSpecificItems = {
      admin: [
        { icon: Home, label: 'Dashboard', href: '/admin/dashboard' },
        { icon: BarChart3, label: 'Analytics', href: '/analytics' },
      ],
      cre: [
        { icon: Home, label: 'CRE Dashboard', href: '/cre/dashboard' },
      ],
      ps: [
        { icon: Home, label: 'PS Dashboard', href: '/ps/dashboard' },
      ],
      cre_team_leader: [
        { icon: Home, label: 'CRE TL Dashboard', href: '/cre-team-leader/dashboard' },
        { icon: Users, label: 'Teams', href: '/teams' },
      ],
      cre_icrop: [
        { icon: Home, label: 'CRE ICROP Dashboard', href: '/cre-icrop/dashboard' },
      ],
      branch_head: [
        { icon: Home, label: 'Branch Dashboard', href: '/branch-head/dashboard' },
      ],
      sales_manager: [
        { icon: Home, label: 'Sales Manager Dashboard', href: '/sales-manager/dashboard' },
        { icon: BarChart3, label: 'Analytics', href: '/sales-manager/analytics' },
      ]
    }

    return roleSpecificItems[user?.role as keyof typeof roleSpecificItems] || []
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const navigationItems = getNavigationItems()

  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-lg flex items-center justify-center">
            <User className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-sm text-gray-800">{user?.name || user?.username || "User"}</p>
            <p className="text-xs text-gray-600 capitalize">{user?.role?.replace('_', ' ')}</p>
          </div>
        </div>
        {isMobile && (
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            aria-label="Close navigation menu"
          >
            <X className="w-5 h-5 text-gray-700" />
          </button>
        )}
      </div>

      {/* Navigation Items */}
      <nav className="mt-6 px-3 flex-1">
        {navigationItems.map((item, index) => {
          const Icon = item.icon
          return (
            <Link
              key={index}
              href={item.href}
              onClick={isMobile ? () => setSidebarOpen(false) : undefined}
              className="flex items-center space-x-3 px-3 py-3 mb-2 rounded-lg transition-all duration-200 group hover:bg-blue-50 border border-transparent hover:border-blue-200"
            >
              <Icon className="w-5 h-5 text-gray-700" />
              <span className="text-gray-800 font-medium text-sm">
                {item.label}
              </span>
              <ChevronRight className="w-4 h-4 text-gray-500 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          )
        })}
      </nav>

      {/* Sign Out Button */}
      <div className="p-3 border-t border-gray-200">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center space-x-3 px-3 py-3 rounded-lg transition-all duration-200 group hover:bg-red-50 border border-transparent hover:border-red-200"
        >
          <LogOut className="w-5 h-5 text-gray-700" />
          <span className="text-gray-800 font-medium text-sm">
            Sign Out
          </span>
        </button>
      </div>
    </>
  )

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Desktop Sidebar - Always visible on md+ */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
        <div className="flex flex-col flex-grow bg-white shadow-sm border-r border-gray-200">
          <SidebarContent />
        </div>
      </div>

      {/* Hamburger Menu Button - Only visible on mobile */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="fixed top-4 left-4 z-50 md:hidden bg-white shadow-lg rounded-lg p-2 border border-gray-200 hover:bg-gray-50 transition-colors"
        aria-expanded={sidebarOpen}
        aria-label="Open navigation menu"
      >
        <Menu className="w-5 h-5 text-gray-700" />
      </button>

      {/* Mobile Backdrop overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile Off-canvas Sidebar */}
      {sidebarOpen && (
        <FocusTrap>
          <div className="fixed left-0 top-0 h-full bg-white shadow-2xl transition-transform duration-300 ease-in-out z-50 w-64 md:hidden translate-x-0">
            <SidebarContent isMobile={true} />
          </div>
        </FocusTrap>
      )}

      {/* Main Content - Responsive padding for sidebar */}
      <div className="flex-1 md:ml-64">
        <main className="py-6">
          <div className="px-4 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  )
}