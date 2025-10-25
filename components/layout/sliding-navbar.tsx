'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Home,
  Users,
  BarChart3,
  Settings,
  LogOut,
  User,
  UserCheck,
  TrendingUp,
  FileText,
  ChevronRight,
  X
} from 'lucide-react'

interface SlidingNavbarProps {
  userRole: string
  userName: string
  isMobile?: boolean
  onClose?: () => void
}

export default function SlidingNavbar({ userRole, userName, isMobile = false, onClose }: SlidingNavbarProps) {
  const [isExpanded, setIsExpanded] = useState(isMobile)
  const router = useRouter()

  const handleSignOut = () => {
    localStorage.removeItem('supabase_user')
    localStorage.removeItem('user')
    router.push('/auth/login')
  }

  const getNavigationItems = () => {
    const roleSpecificItems = {
      admin: [
        { icon: Home, label: 'Dashboard', href: '/admin/dashboard' },
        { icon: BarChart3, label: 'Analytics', href: '/admin/analytics' },
        { icon: Settings, label: 'Admin', href: '/admin' },
      ],
      cre: [
        { icon: Home, label: 'CRE Dashboard', href: '/cre/dashboard' },
      ],
      ps: [
        { icon: Home, label: 'PS Dashboard', href: '/ps/dashboard' },
        { icon: BarChart3, label: 'Analytics', href: '/admin/analytics' },
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
      receptionist: [
        { icon: Home, label: 'Dashboard', href: '/receptionist/dashboard' },
      ],
      sales_manager: [
        { icon: Home, label: 'Sales Manager Dashboard', href: '/sales-manager/dashboard' },
        { icon: BarChart3, label: 'Analytics', href: '/sales-manager/analytics' },
      ],
      cre_team_leader: [
        { icon: Home, label: 'CRE TL Dashboard', href: '/cre-team-leader/dashboard' },
        { icon: Users, label: 'Teams', href: '/teams' },
        { icon: UserCheck, label: 'Walk-in CRE Assignment', href: '/cre-team-leader/assign-walkin-cre' },
      ]
    }

    return roleSpecificItems[userRole as keyof typeof roleSpecificItems] || []
  }

  const navigationItems = getNavigationItems()

  return (
    <>
      {/* Sliding Navbar */}
      <div
        className={`${isMobile ? 'w-full h-full relative flex flex-col overflow-hidden' : 'fixed left-0 top-0 h-full'} bg-white/5 backdrop-blur-lg border-r border-orange-200/30 shadow-2xl transition-all duration-300 ease-in-out z-50 ${
          !isMobile && (isExpanded ? 'w-64' : 'w-16')
        }`}
        onMouseEnter={!isMobile ? () => setIsExpanded(true) : undefined}
        onMouseLeave={!isMobile ? () => setIsExpanded(false) : undefined}
        style={{
          background: 'linear-gradient(135deg, rgba(248,250,252,0.95) 0%, rgba(254,243,235,0.95) 50%, rgba(254,226,226,0.95) 100%)',
          backdropFilter: 'blur(25px)',
          WebkitBackdropFilter: 'blur(25px)'
        }}
      >
        {/* Header */}
        <div className="p-4 border-b border-orange-200/40">
          <div className={`flex items-center ${isMobile ? 'justify-center' : 'justify-between'}`}>
            <div className={`flex items-center space-x-3 ${isMobile ? 'flex-col space-x-0 space-y-2' : ''}`}>
              <div className="w-8 h-8 bg-gradient-to-br from-orange-400/20 to-red-400/20 backdrop-blur-sm rounded-lg flex items-center justify-center border border-orange-300/40">
                <User className="w-5 h-5 text-orange-700 drop-shadow-sm" />
              </div>
              {(isExpanded || isMobile) && (
                <div className={`text-gray-800 ${isMobile ? 'text-center' : ''}`}>
                  <p className="font-bold text-sm text-gray-800 drop-shadow-sm">{userName}</p>
                  <p className="text-xs text-orange-700 font-medium capitalize drop-shadow-sm">{userRole.replace('_', ' ')}</p>
                </div>
              )}
            </div>
            {isMobile && onClose && (
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-1 hover:bg-orange-400/20 rounded transition-colors"
                aria-label="Close navigation menu"
              >
                <X className="w-5 h-5 text-orange-700 drop-shadow-sm" />
              </button>
            )}
          </div>
        </div>

        {/* Navigation Items */}
        <nav className={`mt-6 px-3 ${isMobile ? 'flex-1' : ''}`}>
          {navigationItems.map((item, index) => {
            const Icon = item.icon
            return (
              <Link
                key={index}
                href={item.href}
                onClick={isMobile && onClose ? onClose : undefined}
                className={`flex items-center space-x-3 px-3 py-3 mb-2 rounded-lg transition-all duration-200 group hover:bg-gradient-to-r hover:from-orange-100 hover:to-red-100 backdrop-blur-sm border border-transparent hover:border-orange-300/50 ${
                  isMobile ? 'justify-center' : (isExpanded ? 'justify-start' : 'justify-center')
                }`}
              >
                <Icon className="w-5 h-5 text-orange-700 drop-shadow-sm" />
                {(isExpanded || isMobile) && (
                  <span className="text-gray-800 font-semibold text-sm transition-colors drop-shadow-sm group-hover:text-orange-700">
                    {item.label}
                  </span>
                )}
                {(isExpanded || isMobile) && (
                  <ChevronRight className="w-4 h-4 text-orange-600 ml-auto opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-sm" />
                )}
              </Link>
            )
          })}
        </nav>

        {/* Sign Out Button */}
        <div className={`${isMobile ? 'p-4 border-t border-orange-200/40 mt-auto pb-6' : 'absolute bottom-4 left-3 right-3'}`}>
          <button
            onClick={handleSignOut}
            className={`w-full flex items-center space-x-3 px-3 py-3 rounded-lg transition-all duration-200 group hover:bg-gradient-to-r hover:from-red-100 hover:to-orange-100 backdrop-blur-sm border border-orange-300/40 hover:border-red-300/60 ${
              isMobile ? 'justify-center' : (isExpanded ? 'justify-start' : 'justify-center')
            }`}
          >
            <LogOut className="w-5 h-5 text-red-600 drop-shadow-sm" />
            {(isExpanded || isMobile) && (
              <span className="text-red-600 font-semibold text-sm transition-colors drop-shadow-sm">
                Sign Out
              </span>
            )}
          </button>
        </div>
      </div>
    </>
  )
}
