"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  hasPermission,
  canAccessRoute,
  canAccessResource,
  type UserRole,
  type ResourceOwnership,
} from "@/lib/permissions"

interface UserProfile {
  id: string
  role: UserRole
  branch_id: string | null
}

export function usePermissions() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    const supabase = createClient()

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      const { data } = await supabase.from("profiles").select("id, role, branch_id").eq("id", user.id).single()

      if (data) {
        setProfile(data as UserProfile)
      }
    } catch (error) {
      console.error("Error fetching profile:", error)
    } finally {
      setLoading(false)
    }
  }

  const checkPermission = (resource: string, action: "create" | "read" | "update" | "delete" | "manage") => {
    if (!profile) return false
    return hasPermission(profile.role, resource, action)
  }

  const checkRouteAccess = (route: string) => {
    if (!profile) return false
    return canAccessRoute(profile.role, route)
  }

  const checkResourceAccess = (resource: ResourceOwnership, action: "create" | "read" | "update" | "delete") => {
    if (!profile) return false
    return canAccessResource(profile.role, profile.id, profile.branch_id, resource, action)
  }

  const isAdmin = () => profile?.role === "admin"
  const isBranchHead = () => profile?.role === "branch_head"
  const isCRE = () => profile?.role === "cre"
  const isPS = () => profile?.role === "ps"
  const isReceptionist = () => profile?.role === "receptionist"

  return {
    profile,
    loading,
    checkPermission,
    checkRouteAccess,
    checkResourceAccess,
    isAdmin,
    isBranchHead,
    isCRE,
    isPS,
    isReceptionist,
  }
}
