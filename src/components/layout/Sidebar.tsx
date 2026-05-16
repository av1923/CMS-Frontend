import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  BookOpen,
  Users,
  DollarSign,
  FileText,
  LogOut,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useRole } from '@/contexts/RoleContext'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Academic Programs', href: '/courses', icon: BookOpen },
  { name: 'Faculty Hub', href: '/instructors', icon: Users },
  { name: 'Enrollment Hub', href: '/enrollment', icon: DollarSign },
  { name: 'Security Logs', href: '/reports', icon: FileText },
]

export function Sidebar() {
  const { user, logout } = useAuth()
  const { role } = useRole()
  const location = useLocation()
  const navigate = useNavigate()

  let visibleNavigation = navigation

  if (role === 'Curriculum Committee') {
    visibleNavigation = navigation.filter((item) => ['Dashboard', 'Academic Programs'].includes(item.name))
  } else if (role === 'Department Chair') {
    visibleNavigation = navigation.filter((item) => ['Dashboard', 'Academic Programs', 'Faculty Hub', 'Enrollment Hub'].includes(item.name))
  } else if (role === 'Registrar') {
    visibleNavigation = navigation.filter((item) => ['Dashboard', 'Academic Programs', 'Enrollment Hub'].includes(item.name))
  }

  return (
    <div className="fixed left-0 top-0 w-72 h-screen bg-[#0f2147] text-white shadow-lg flex flex-col">
      <div className="p-6 flex-1 overflow-y-auto overflow-x-hidden no-scrollbar">
        <div className="mb-6">
          <h2 className="text-2xl font-extrabold italic leading-none tracking-tight uppercase">
            <span className="block">Course</span>
            <span className="block">Management</span>
            <span className="block">System</span>
          </h2>
        </div>

        <div className="mt-4">
          <div className="text-xs uppercase text-gray-300 mb-2">Main Menu</div>
          <nav className="space-y-1">
            {visibleNavigation.map((item) => {
              const Icon = item.icon
              const pathname = location.pathname
              const isAcademicActive = pathname.startsWith('/courses') || pathname.startsWith('/prerequisites')
              const active = item.name === 'Academic Programs' ? isAcademicActive : pathname === item.href

              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={() =>
                    `group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-yellow-300 ${
                      active
                        ? 'bg-yellow-400 text-[#0f2147]'
                        : 'text-gray-200 hover:bg-yellow-400/10 hover:text-white'
                    }`
                  }
                >
                  <Icon className="mr-3 h-5 w-5 flex-shrink-0" />
                  {item.name}
                </NavLink>
              )
            })}
          </nav>
        </div>
      </div>

      <div className="mt-auto p-6 border-t border-white/10">
        <div className="flex flex-col items-start gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center text-[#0f2147]">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
            </div>
            <div>
              <div className="text-sm font-semibold">{user?.name || 'User'}</div>
              <div className="text-xs text-gray-300">{user?.role || 'Guest'}</div>
            </div>
          </div>

          <button
            onClick={() => {
              logout()
              navigate('/')
            }}
            className="w-full text-left px-3 py-2 rounded-md text-sm text-yellow-400 hover:text-yellow-300 hover:bg-yellow-400/5 flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  )
}