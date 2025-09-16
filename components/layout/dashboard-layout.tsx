"use client"
import type React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Sidebar } from "./sidebar"

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
  const supabase = createClient()

  useEffect(() => {
    const checkAuth = () => {
      try {
        // Check for session in localStorage
        const manualSession = localStorage.getItem("supabase_user")
        if (manualSession) {
          console.log("📝 Manual session found")
          const userData = JSON.parse(manualSession)
          setUser(userData)
        } else {
          console.log("❌ No session found, redirecting to login")
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
      {/* Sidebar removed per requirement */}
      <div className="">
        <main className="py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  )
}