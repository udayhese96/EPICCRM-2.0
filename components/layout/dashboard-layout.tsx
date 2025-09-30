"use client"
import type React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Menu, X } from "lucide-react"
import { FocusTrap } from "focus-trap-react"
import SlidingNavbar from "./sliding-navbar"

interface DashboardLayoutProps {
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

export function DashboardLayout({ children }: DashboardLayoutProps) {
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

  const getUserProfile = async (email: string) => {
    try {
      // Try to find user in admin_users first
      let { data: adminUser } = await supabase
        .from('admin_users')
        .select('*')
        .eq('email', email)
        .single()

      if (adminUser) {
        setUser({ ...adminUser, role: 'admin' })
        return
      }

      // Try CRE users
      let { data: creUser } = await supabase
        .from('cre_users')
        .select('*')
        .eq('email', email)
        .single()

      if (creUser) {
        setUser({ ...creUser, role: 'cre' })
        return
      }

      // Try PS users
      let { data: psUser } = await supabase
        .from('ps_users')
        .select('*')
        .eq('email', email)
        .single()

      if (psUser) {
        setUser({ ...psUser, role: 'ps' })
        return
      }

      // Try Branch Head users
      let { data: bhUser } = await supabase
        .from('bh_users')
        .select('*')
        .eq('email', email)
        .single()

      if (bhUser) {
        setUser({ ...bhUser, role: 'branch_head' })
        return
      }

      // If no user found, redirect to login
      router.push("/auth/login")
    } catch (error) {
      console.error("Error getting user profile:", error)
      router.push("/auth/login")
    }
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop Sliding Navbar - Hidden on mobile */}
      <div className="hidden lg:block">
        <SlidingNavbar userRole={user?.role || "user"} userName={user?.name || user?.username || "User"} />
      </div>

      {/* Mobile Hamburger Menu Button */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="fixed top-2 left-2 z-50 lg:hidden bg-white shadow-lg rounded-lg p-2 border border-gray-200 hover:bg-gray-50 transition-colors"
        aria-expanded={sidebarOpen}
        aria-label="Open navigation menu"
      >
        <Menu className="w-4 h-4 text-gray-700" />
      </button>

      {/* Mobile Backdrop overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile Off-canvas Sidebar */}
      {sidebarOpen && (
        <FocusTrap>
          <div className="fixed left-0 top-0 h-full bg-white shadow-2xl transition-transform duration-300 ease-in-out z-50 w-64 lg:hidden translate-x-0">
            <SlidingNavbar
              userRole={user?.role || "user"}
              userName={user?.name || user?.username || "User"}
              isMobile={true}
              onClose={() => setSidebarOpen(false)}
            />
          </div>
        </FocusTrap>
      )}

      {/* Main Content - Responsive padding for sidebar */}
      <div className="lg:pl-16">
        <main className="py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  )
}