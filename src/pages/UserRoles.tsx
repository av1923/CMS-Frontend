import { GraduationCap, ShieldCheck, Users, ClipboardList } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useRole } from '@/contexts/RoleContext'

const roles = [
  {
    title: 'System Admin',
    description: 'Full architectural oversight & IAM control',
    icon: ShieldCheck,
    role: 'Admin' as const,
  },
  {
    title: 'Curriculum Committee',
    description: 'Manage proposals & prerequisite chains',
    icon: GraduationCap,
    role: 'Curriculum Committee' as const,
  },
  {
    title: 'Department Chair',
    description: 'Faculty allocation & workload monitoring',
    icon: Users,
    role: 'Department Chair' as const,
  },
  {
    title: 'Registrar',
    description: 'Section capacity & academic records',
    icon: ClipboardList,
    role: 'Registrar' as const,
  },
]

export function UserRoles() {
  const navigate = useNavigate()
  const { setRole } = useRole()

  const handleRoleSelect = (role: (typeof roles)[number]['role']) => {
    setRole(role)
    navigate('/dashboard')
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#081a66] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,209,51,0.12),_transparent_36%),radial-gradient(circle_at_bottom,_rgba(255,255,255,0.08),_transparent_30%),linear-gradient(180deg,_#081a66_0%,_#07124b_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:90px_90px] opacity-10" />
      <div className="absolute -left-24 top-24 h-72 w-72 rounded-full bg-[#ffd233]/10 blur-3xl" />
      <div className="absolute -right-16 bottom-0 h-80 w-80 rounded-full bg-white/8 blur-3xl" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-[1400px] flex-col items-center px-6 py-14 sm:px-10 lg:px-16">
        <div className="text-center">
          <div className="text-[0.7rem] font-extrabold tracking-[0.55em] text-[#ffd233] sm:text-xs">
            COURSE MANAGEMENT SYSTEM
          </div>
          <h1 className="mt-4 text-4xl font-black italic tracking-tight text-white sm:text-6xl lg:text-7xl">
            WHAT IS YOUR ROLE?
          </h1>
          <p className="mx-auto mt-5 max-w-3xl text-sm leading-6 text-white/45 sm:text-base">
            Please verify your administrative identity to synchronize the subsystem environment.
          </p>
        </div>

        <div className="mt-14 grid w-full grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4 xl:gap-6">
          {roles.map((item) => {
            const Icon = item.icon

            return (
              <button
                key={item.role}
                type="button"
                onClick={() => handleRoleSelect(item.role)}
                className="group flex min-h-[280px] flex-col justify-between rounded-[2rem] border border-white/6 bg-white/6 p-7 text-left shadow-[0_20px_60px_rgba(0,0,0,0.24)] backdrop-blur-sm transition-all duration-200 hover:-translate-y-1 hover:bg-white/10 hover:shadow-[0_24px_70px_rgba(0,0,0,0.3)] sm:p-8"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/8 text-white/55 transition-colors group-hover:bg-[#ffd233]/15 group-hover:text-[#ffd233]">
                  <Icon className="h-7 w-7" />
                </div>

                <div className="space-y-3">
                  <h2
                    className={`min-h-[5.25rem] text-2xl font-black leading-[0.9] tracking-tight text-white sm:min-h-[5.75rem] sm:text-[2rem] ${
                      item.role === 'Admin' ? 'max-w-[7ch] sm:max-w-[8ch]' : 'max-w-[12ch]'
                    }`}
                  >
                    {item.title}
                  </h2>
                  <p className="max-w-[18ch] text-sm leading-6 text-white/40 sm:text-base">
                    {item.description}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default UserRoles