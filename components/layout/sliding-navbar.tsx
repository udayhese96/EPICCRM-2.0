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
  ChevronRight
} from 'lucide-react'

interface SlidingNavbarProps {
  userRole: string
  userName: string
}

export default function SlidingNavbar({ userRole, userName }: SlidingNavbarProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const router = useRouter()

  const handleSignOut = () => {
    localStorage.removeItem('supabase_user')
    localStorage.removeItem('user')
    router.push('/auth/login')
  }

  const getNavigationItems = () => {
    const roleSpecificItems = {
      admin: [
        { icon: Home, label: 'Dashboard', href: '/dashboard' },
        { icon: BarChart3, label: 'Analytics', href: '/analytics' },
        { icon: Settings, label: 'Admin', href: '/admin' },
      ],
      cre: [
        { icon: Home, label: 'CRE Dashboard', href: '/cre/dashboard' },
      ],
      ps: [
        { icon: Home, label: 'PS Dashboard', href: '/ps/dashboard' },
        { icon: BarChart3, label: 'Analytics', href: '/ps/analytics' },
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
      ]
    }

    return roleSpecificItems[userRole as keyof typeof roleSpecificItems] || []
  }

  const navigationItems = getNavigationItems()

  return (
    <>
      {/* Sliding Navbar */}
      <div 
        className={`fixed left-0 top-0 h-full bg-white/5 backdrop-blur-lg border-r border-cyan-200/30 shadow-2xl transition-all duration-300 ease-in-out z-50 ${
          isExpanded ? 'w-64' : 'w-16'
        }`}
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(14,165,233,0.15) 50%, rgba(6,182,212,0.12) 100%)',
          backdropFilter: 'blur(25px)',
          WebkitBackdropFilter: 'blur(25px)'
        }}
      >
        {/* Header */}
        <div className="p-4 border-b border-cyan-200/40">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-cyan-400/20 to-teal-400/20 backdrop-blur-sm rounded-lg flex items-center justify-center border border-cyan-300/40">
              <User className="w-5 h-5 text-gray-800 drop-shadow-sm" />
            </div>
            {isExpanded && (
              <div className="text-gray-800">
                <p className="font-bold text-sm text-gray-800 drop-shadow-sm">{userName}</p>
                <p className="text-xs text-gray-700 font-medium capitalize drop-shadow-sm">{userRole.replace('_', ' ')}</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="mt-6 px-3">
          {navigationItems.map((item, index) => {
            const Icon = item.icon
            return (
              <Link
                key={index}
                href={item.href}
                className={`flex items-center space-x-3 px-3 py-3 mb-2 rounded-lg transition-all duration-200 group hover:bg-cyan-400/20 backdrop-blur-sm border border-transparent hover:border-cyan-300/50 ${
                  isExpanded ? 'justify-start' : 'justify-center'
                }`}
              >
                <Icon className="w-5 h-5 text-gray-800 drop-shadow-sm" />
                {isExpanded && (
                  <span className="text-gray-800 font-semibold text-sm transition-colors drop-shadow-sm">
                    {item.label}
                  </span>
                )}
                {isExpanded && (
                  <ChevronRight className="w-4 h-4 text-gray-600 ml-auto opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-sm" />
                )}
              </Link>
            )
          })}
        </nav>

        {/* Sign Out Button */}
        <div className="absolute bottom-4 left-3 right-3">
          <button
            onClick={handleSignOut}
            className={`w-full flex items-center space-x-3 px-3 py-3 rounded-lg transition-all duration-200 group hover:bg-cyan-400/20 backdrop-blur-sm border border-cyan-300/40 hover:border-cyan-300/60 ${
              isExpanded ? 'justify-start' : 'justify-center'
            }`}
          >
            <LogOut className="w-5 h-5 text-gray-800 drop-shadow-sm" />
            {isExpanded && (
              <span className="text-gray-800 font-semibold text-sm transition-colors drop-shadow-sm">
                Sign Out
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Overlay for mobile */}
      {isExpanded && (
        <div className="fixed inset-0 bg-black/20 z-40 lg:hidden" />
      )}
    </>
  )
}
