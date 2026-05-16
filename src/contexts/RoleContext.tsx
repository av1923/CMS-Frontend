import React, { createContext, useContext, useEffect, useState } from 'react'

// Frontend role type (for UI display)
export type Role = 'Admin' | 'Curriculum Committee' | 'Department Chair' | 'Registrar'

// Backend role format mapping (backend uses spaced format like "SYSTEM ADMIN")
const backendToFrontend: Record<string, Role> = {
  'SYSTEM ADMIN': 'Admin',
  'CURRICULUM COMMITTEE': 'Curriculum Committee',
  'DEPARTMENT CHAIR': 'Department Chair',
  'REGISTRAR': 'Registrar',
  // Fallback for old formats
  'Admin': 'Admin',
  'CurriculumCommittee': 'Curriculum Committee',
  'DepartmentChair': 'Department Chair',
  'Registrar': 'Registrar'
}

const frontendToBackend: Record<Role, string> = {
  'Admin': 'SYSTEM ADMIN',
  'Curriculum Committee': 'CURRICULUM COMMITTEE',
  'Department Chair': 'DEPARTMENT CHAIR',
  'Registrar': 'REGISTRAR'
}

type RoleContextType = {
  role: Role
  setRole: (r: Role) => void
  getBackendRole: (frontendRole: Role) => string
}

const RoleContext = createContext<RoleContextType | undefined>(undefined)

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<Role>(() => {
    const storedRole = localStorage.getItem('user_role')
    // Handle both frontend and backend formats
    if (storedRole) {
      return backendToFrontend[storedRole] || (storedRole as Role) || 'Admin'
    }
    return 'Admin'
  })

  useEffect(() => {
    localStorage.setItem('user_role', role)
  }, [role])

  const getBackendRole = (frontendRole: Role): string => {
    return frontendToBackend[frontendRole] || frontendRole
  }

  return <RoleContext.Provider value={{ role, setRole, getBackendRole }}>{children}</RoleContext.Provider>
}

export function useRole() {
  const ctx = useContext(RoleContext)
  if (!ctx) throw new Error('useRole must be used within RoleProvider')
  return ctx
}

export default RoleProvider