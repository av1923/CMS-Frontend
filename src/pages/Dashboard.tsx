import { useEffect, useState } from 'react'
import {
  BookOpen,
  Users,
  TrendingUp,
  Sparkles,
  ShieldCheck,
  ClipboardList,
  Calendar,
  BookMarked,
  ArrowUpRight,
  UserRound,
} from 'lucide-react'
import DashboardCard from '../components/dashboard/DashboardCard'
import { useRole } from '@/contexts/RoleContext'
import { useAuth } from '@/hooks/useAuth'
import { Link } from 'react-router-dom'
import { api } from '@/utils/api'


const modules = [
  { title: 'Academic Programs', desc: 'Propose and manage the curriculum lifecycle, including academic catalog and prerequisite chains.', icon: Sparkles, to: '/courses/manage' },
  { title: 'Academic Catalog', desc: 'Browse historical and active courses — the authoritative source of IAE course data.', icon: BookOpen, to: '/courses' },
  { title: 'Faculty Hub', desc: 'Assign faculty to sections and monitor teaching workloads for conflict resolution.', icon: Users, to: '/instructors' },
  { title: 'Enrollment Hub', desc: 'Manage section capacity limits and scheduling synchronized with SRM.', icon: Calendar, to: '/enrollment' },
  { title: 'Security Logs', desc: 'Trace administrative changes and ensure system accountability for audit purposes.', icon: ShieldCheck, to: '/reports' },
  { title: 'Prerequisite Manager', desc: 'Define and manage course prerequisite/co-requisite chains to ensure academic flow integrity.', icon: ClipboardList, to: '/prerequisites' },
]

export function Dashboard() {
  const { role } = useRole()
  const { user } = useAuth()
  const [stats, setStats] = useState({
    catalogCount: 0,
    instructorCount: 0,
    underReviewCount: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const displayName = user?.name?.split(' ').pop() || user?.name || 'User'
  const roleLabel = role.toUpperCase()
  const roleSubline =
    role === 'Admin'
      ? 'SYSTEM-WIDE ADMINISTRATIVE ACCESS'
      : role === 'Registrar'
        ? 'ACADEMIC RECORDS & SECTION CAPACITY MANAGEMENT'
        : role === 'Department Chair'
          ? 'FACULTY WORKLOAD & INSTRUCTION ASSIGNMENT'
          : 'ACADEMIC PROGRAM AND CURRICULUM DEVELOPMENT PORTAL'

  useEffect(() => {
    let alive = true

    const loadStats = async () => {
      try {
        setIsLoading(true)
        
        // Fetch all stats in parallel
        const [catalogRes, instructorsRes, underReviewRes] = await Promise.all([
          // Get total courses from catalog
          api.get('/catalog', { limit: 1 }).catch(() => ({ total: 0 })),
          // Get instructor assignments count
          api.get('/instructors', { limit: 1 }).catch(() => ({ instructors: [] })),
          // Get under review (draft) courses - use catalog with status filter
          api.get('/catalog', { status: 'draft', limit: 1 }).catch(() => ({ total: 0 })),
        ])

        if (alive) {
          setStats({
            catalogCount: catalogRes?.total ?? 0,
            instructorCount: instructorsRes?.instructors?.length ?? 0,
            underReviewCount: underReviewRes?.total ?? 0,
          })
        }
      } catch (error) {
        console.error('Failed to load dashboard stats', error)
      } finally {
        if (alive) {
          setIsLoading(false)
        }
      }
    }

    void loadStats()

    const handleProposalUpdate = () => {
      void loadStats()
    }

    window.addEventListener('cms:proposals-updated', handleProposalUpdate)

    return () => {
      alive = false
      window.removeEventListener('cms:proposals-updated', handleProposalUpdate)
    }
  }, [])

  // Filter modules based on role
  const visibleModules = (() => {
    if (role === 'Curriculum Committee') {
      return modules.filter((m) => ['Academic Programs', 'Active Catalog', 'Prerequisite Manager'].includes(m.title))
    }

    if (role === 'Department Chair') {
      return modules
        .filter((m) => ['Academic Programs', 'Faculty Hub', 'Enrollment Hub'].includes(m.title))
        .map((m) => (m.title === 'Academic Programs' ? { ...m, to: '/courses' } : m))
    }

    if (role === 'Registrar') {
      return modules.filter((m) => ['Academic Programs', 'Enrollment Hub'].includes(m.title))
        .map((m) => (m.title === 'Academic Programs' ? { ...m, to: '/courses' } : m))
    }

    return modules
  })()

  const topStats = [
    { name: 'Academic Catalog', value: stats.catalogCount, icon: BookMarked },
    { name: 'Faculty Hub', value: stats.instructorCount, icon: Users },
    { name: 'Under Review', value: stats.underReviewCount, icon: ArrowUpRight },
  ]

  return (
    <div className="space-y-6 pb-6">
      <header className="pt-1">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-3xl font-black italic tracking-tight text-[#0f2147] sm:text-[2.75rem]">
                WELCOME BACK, {displayName}
              </h2>
              <span className="inline-flex items-center rounded-full bg-[#0f2147] px-3.5 py-1 text-[0.65rem] font-extrabold tracking-[0.14em] text-[#ffd233] shadow-[0_10px_24px_rgba(15,33,71,0.18)]">
                {roleLabel}
              </span>
            </div>
            <p className="mt-2 text-xs font-semibold tracking-[0.28em] text-[#0f2147]/55">
              {roleSubline}
            </p>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto grid grid-cols-1 justify-items-center gap-3 px-0 sm:grid-cols-3">
        {topStats.map((stat, index) => {
          const Icon = stat.icon ?? (index === 1 ? UserRound : TrendingUp)
          const isHighlighted = index === 2

          return (
            <Link
              key={stat.name}
              to={index === 0 ? '/courses' : index === 1 ? '/instructors' : '/courses/manage'}
              className={`relative block w-full max-w-[350px] rounded-2xl bg-white shadow-[0_10px_24px_rgba(15,33,71,0.08)] transition-transform hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(15,33,71,0.12)] ${
                isHighlighted ? 'ring-1 ring-[#ffd233] ring-inset' : 'ring-1 ring-[#0f2147]/10 ring-inset'
              }`}
            >
              <div className={`absolute left-0 top-0 h-full w-1.5 rounded-l-2xl ${isHighlighted ? 'bg-[#ffd233]' : 'bg-[#e1e7f7]'}`} />
              <div className="flex items-center gap-3 px-4 py-3.5 pl-6">
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${index === 1 ? 'bg-[#fff2bf]' : 'bg-[#f4f6fb]'}`}>
                  <Icon className="h-5 w-5 text-[#0f2147]" />
                </div>
              <div>
                <div className="text-xl font-black text-[#0f2147]">
                  {isLoading ? '-' : stat.value}
                </div>
                <div className="mt-1 text-[0.6rem] font-bold tracking-[0.22em] text-[#8d97b3] uppercase">{stat.name}</div>
              </div>
              </div>
            </Link>
          )
        })}
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 justify-items-center gap-2.5 md:grid-cols-2 xl:grid-cols-3">
        {visibleModules.map((m, index) => (
          <div key={m.title} className={index === 0 ? 'md:col-span-1 w-full flex justify-center' : 'w-full flex justify-center'}>
            <DashboardCard title={m.title} description={m.desc} icon={m.icon} to={m.to} />
          </div>
        ))}
      </div>
    </div>
  )
}

export default Dashboard