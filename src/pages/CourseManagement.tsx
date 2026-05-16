import { useEffect } from 'react'
import { useRole } from '@/contexts/RoleContext'
import { useLocation, useNavigate } from 'react-router-dom'

export default function CourseManagement() {
  const { role } = useRole()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    // Department Chair can only view the Academic Catalog inside Academic Programs
    if (role === 'Department Chair') {
      const path = location.pathname
      if (path !== '/courses') {
        navigate('/courses', { replace: true })
      }
    }

    // Registrar should be sent to Proposal Oversight view inside Academic Programs
    if (role === 'Registrar') {
      const path = location.pathname
      if (path !== '/courses/oversight') {
        navigate('/courses/oversight', { replace: true })
      }
    }
  }, [role, location.pathname, navigate])

  useEffect(() => {
    navigate('/courses', { replace: true })
  }, [navigate])

  return (
    <div className="space-y-6">
      <header className="pb-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-extrabold italic text-[#0f2147] tracking-tight">ACADEMIC PROGRAMS</h1>
          <p className="mt-2 text-sm text-[#0f2147]">ACADEMIC PROGRAM & CURRICULUM DEVELOPMENT PORTAL</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4">
        <div className="mx-auto max-w-4xl bg-white rounded-3xl shadow-md border border-gray-100 p-8 sm:p-12 text-center">
          <h2 className="text-4xl font-extrabold text-[#0f2147] uppercase tracking-wide">ACADEMIC CATALOG</h2>
          <p className="mt-2 text-sm text-[#6b7280] uppercase tracking-wide">Browse and manage the active academic catalog.</p>
        </div>
      </main>
    </div>
  )
}
