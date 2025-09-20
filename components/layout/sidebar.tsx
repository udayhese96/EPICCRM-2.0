"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
// import { usePermissions } from "@/hooks/use-permissions"
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Building2,
  Contact,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  UsersIcon,
  ArrowRightLeft,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

interface SidebarProps {
  userRole: string
}

const getNavigationForRole = (role: string) => {
  switch (role) {
    case "admin":
      return [
        {
          name: "Admin Dashboard",
          href: "/admin/dashboard",
          icon: LayoutDashboard,
        },
        {
          name: "Assign Leads",
          href: "/admin/assign-leads",
          icon: ArrowRightLeft,
        },
        {
          name: "All Leads",
          href: "/leads",
          icon: Contact,
        },
        {
          name: "Manage CRE",
          href: "/admin/manage-cre",
          icon: Users,
        },
        {
          name: "Manage PS",
          href: "/admin/manage-ps",
          icon: UserPlus,
        },
        {
          name: "Users",
          href: "/admin/users",
          icon: UsersIcon,
        },
        {
          name: "Branches",
          href: "/admin/branches",
          icon: Building2,
        },
        {
          name: "Reports",
          href: "/reports",
          icon: BarChart3,
        },
        {
          name: "Settings",
          href: "/admin/settings",
          icon: Settings,
        },
      ]
    case "cre":
      return [
        {
          name: "CRE Dashboard",
          href: "/cre/dashboard",
          icon: LayoutDashboard,
        },
        {
          name: "Analytics",
          href: "/analytics",
          icon: BarChart3,
        },
      ]
    case "cre_team_leader":
      return [
        {
          name: "CRE Team Leader Dashboard",
          href: "/cre-team-leader/dashboard",
          icon: LayoutDashboard,
        },
        {
          name: "Qualified Leads",
          href: "/cre-team-leader/qualified",
          icon: Contact,
        },
        {
          name: "Analytics",
          href: "/analytics",
          icon: BarChart3,
        },
      ]
    case "ps":
      return [
        {
          name: "GEM Dashboard", 
          href: "/ps/dashboard",
          icon: LayoutDashboard,
        },
        {
          name: "Fresh Leads",
          href: "/leads",
          icon: Contact,
        },
        {
          name: "Walk-in Leads",
          href: "/leads?tab=walkin",
          icon: UsersIcon,
        },
        {
          name: "Analytics",
          href: "/analytics",
          icon: BarChart3,
        },
      ]
    case "branch_head":
      return [
        {
          name: "Branch Dashboard",
          href: "/branch-head/dashboard", 
          icon: LayoutDashboard,
        },
        {
          name: "All Leads",
          href: "/leads",
          icon: Contact,
        },
        {
          name: "Team Performance",
          href: "/reports",
          icon: BarChart3,
        },
        {
          name: "Manage PS",
          href: "/admin/users",
          icon: UsersIcon,
        },
      ]
    default:
      return [
        {
          name: "Dashboard",
          href: "/dashboard",
          icon: LayoutDashboard,
        },
      ]
  }
}

export function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  // Simple permission check based on role
  const checkPermission = (resource: string, action: string): boolean => {
    if (userRole === "admin") return true
    
    switch (userRole) {
      case "cre":
        return ["dashboard", "leads"].includes(resource)
      case "ps": 
        return ["dashboard", "leads"].includes(resource)
      case "branch_head":
        return ["dashboard", "leads", "users", "reports"].includes(resource)
      default:
        return false
    }
  }

  const handleLogout = () => {
    // Clear session data
    localStorage.removeItem("supabase_user")
    localStorage.removeItem("access_token")
    localStorage.removeItem("user")
    
    router.push("/auth/login")
  }

  const navigation = getNavigationForRole(userRole)

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold text-gray-900">EPIC CRM</h2>
        <Button variant="ghost" size="sm" className="lg:hidden" onClick={() => setIsMobileOpen(false)}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1 p-4">
        <nav className="space-y-2">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  isActive ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
                )}
                onClick={() => setIsMobileOpen(false)}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.name}</span>
              </Link>
            )
          })}
        </nav>
      </ScrollArea>

      <div className="p-4 border-t">
        <Button
          variant="ghost"
          className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={handleLogout}
        >
          <LogOut className="h-5 w-5 mr-3" />
          Sign Out
        </Button>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="sm"
        className="lg:hidden fixed top-4 left-4 z-50"
        onClick={() => setIsMobileOpen(true)}
      >
        <Menu className="h-4 w-4" />
      </Button>

      {/* Mobile sidebar */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setIsMobileOpen(false)} />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:bg-white lg:border-r lg:border-gray-200">
        <SidebarContent />
      </div>
    </>
  )
}
