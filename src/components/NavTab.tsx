import { NavLink } from 'react-router-dom'

export function NavTab({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        `px-2 py-2 relative ${isActive ? 'text-[#0f2147] after:absolute after:left-0 after:right-0 after:-bottom-2 after:h-1 after:bg-[#0f2147]' : 'text-gray-400'}`
      }
    >
      {label}
    </NavLink>
  )
}

export default NavTab
