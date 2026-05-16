import React from 'react'
import { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'

type Props = {
  title: string
  description?: string
  count?: string | number
  icon?: LucideIcon
  to?: string
}

export const DashboardCard: React.FC<Props> = ({ title, description, count, icon: Icon, to }) => {
  const accentIsYellow = title.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) % 2 === 0
  const hoverAccent = accentIsYellow
    ? 'hover:ring-[#ffd233]/70 hover:border-[#ffd233]/70'
    : 'hover:ring-[#4f8cff]/70 hover:border-[#4f8cff]/70'

  const Card = (
    <div className={`group mx-auto h-full w-full max-w-[350px] min-h-[225px] rounded-[1.5rem] bg-white px-4 py-4 shadow-[0_10px_24px_rgba(15,33,71,0.08)] ring-1 ring-[#0f2147]/10 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(15,33,71,0.12)] hover:ring-2 ${hoverAccent} sm:max-w-[365px] sm:min-h-[240px]`}>
      <div className="flex h-full flex-col items-start justify-start gap-4">
        <div className="flex flex-col items-start gap-3">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-[#f4f6fb] transition-colors group-hover:bg-[#0f2147]">
            {Icon ? <Icon className="h-6 w-6 text-[#0f2147] transition-colors group-hover:text-[#ffd233]" /> : null}
          </div>
          <div className="space-y-1.5 pt-1">
            <h3 className="whitespace-nowrap text-[1.08rem] font-black italic leading-none text-[#0f2147] uppercase tracking-tight sm:text-[1.2rem]">{title}</h3>
            {count ? <div className="text-sm font-semibold text-gray-500">{count}</div> : null}
          </div>
        </div>
        {description ? (
          <p className="max-w-sm text-[0.9rem] leading-6 text-[#0f2147]/70">{description}</p>
        ) : null}
      </div>
    </div>
  )

  if (to) return <Link to={to}>{Card}</Link>
  return Card
}

export default DashboardCard
