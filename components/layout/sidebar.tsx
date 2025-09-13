"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { usePermissions } from "@/hooks/use-permissions"
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
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

interface SidebarProps {
  userRole: string
}

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    permission: { resource: "dashboard", action: "read" as const },
  },
  {
    name: "Leads",
    href: "/leads",
    icon: Contact,
    permission: { resource: "leads", action: "read" as const },
  },
  {
    name: "Teams",
    href: "/teams",
    icon: UsersIcon,
    permission: { resource: "users", action: "read" as const },
  },
  {
    name: "Users",
    href: "/admin/users",
    icon: Users,
    permission: { resource: "users", action: "read" as const },
  },
  {
    name: "Add User",
    href: "/admin/users/add",
    icon: UserPlus,
    permission: { resource: "users", action: "create" as const },
  },
  {
    name: "Branches",
    href: "/admin/branches",
    icon: Building2,
    requiredRole: "admin" as const,
  },
  {
    name: "Reports",
    href: "/reports",
    icon: BarChart3,
    permission: { resource: "reports", action: "read" as const },
  },
  {
    name: "Settings",
    href: "/admin/settings",
    icon: Settings,
    requiredRole: "admin" as const,
  },
]

export function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { checkPermission, profile } = usePermissions()
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/auth/login")
  }

  const filteredNavigation = navigation.filter((item) => {
    // Check role requirement
    if (item.requiredRole) {
      return profile?.role === item.requiredRole || profile?.role === "admin"
    }

    // Check permission requirement
    if (item.permission) {
      return checkPermission(item.permission.resource, item.permission.action)
    }

    return true
  })

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
          {filteredNavigation.map((item) => {
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
