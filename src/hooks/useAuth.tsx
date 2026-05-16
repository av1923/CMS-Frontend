import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { User } from '@/types'
import { authApi, clearAuthTokens, getAuthToken, setAuthToken, setRefreshToken, isTokenExpired } from '@/utils/api'

// Normalize backend role format to frontend format
function normalizeRole(role?: string): string {
  if (!role) return 'Admin'
  // Map backend roles (with spaces) to frontend Role type
  if (role === 'SYSTEM ADMIN') return 'Admin'
  if (role === 'CURRICULUM COMMITTEE') return 'Curriculum Committee'
  if (role === 'DEPARTMENT CHAIR') return 'Department Chair'
  if (role === 'REGISTRAR') return 'Registrar'
  // Fallback for already-normalized roles
  if (role === 'CurriculumCommittee') return 'Curriculum Committee'
  if (role === 'DepartmentChair') return 'Department Chair'
  return role
}

type AuthContextType = {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  googleLogin: (idToken: string, role?: string) => Promise<{ success: true; user: User } | { success: false; error?: string }>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const checkAuth = useCallback(async () => {
    const token = getAuthToken()
    
    if (!token) {
      setIsLoading(false)
      return
    }

    // Check if token is expired
    if (isTokenExpired(token)) {
      clearAuthTokens()
      setIsLoading(false)
      return
    }

    // Try to get user data from localStorage first
    const storedUser = localStorage.getItem('user_data')
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser) as User
        // Ensure role is normalized
        const normalizedUser = {
          ...userData,
          role: normalizeRole(userData.role)
        }
        setUser(normalizedUser)
        setIsLoading(false)
        return
      } catch {
        // Fall through to token parsing
      }
    }

    // Fallback: try to get user info from token
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      const userData: User = {
        id: payload.sub || payload.id || '',
        email: payload.email || '',
        name: payload.name || payload.user_name || payload.full_name || payload.email || 'User',
        role: normalizeRole(payload.role) || 'Admin'
      }
      setUser(userData)
      // Store for future refreshes
      localStorage.setItem('user_data', JSON.stringify(userData))
    } catch {
      clearAuthTokens()
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  const googleLogin: AuthContextType['googleLogin'] = async (idToken, role) => {
    try {
      const response = await authApi.googleAuth({ id_token: idToken, role })
      
      // Store tokens
      setAuthToken(response.access_token)
      setRefreshToken(response.refresh_token)
      
      // Normalize role before storing
      const normalizedUser: User = {
        ...response.user,
        role: normalizeRole(response.user.role)
      }
      
      // Store user role in localStorage for header
      localStorage.setItem('user_role', normalizedUser.role)
      
      // Store full user data for persistence
      localStorage.setItem('user_data', JSON.stringify(normalizedUser))
      
      // Set user state
      setUser(normalizedUser)
      
      return { success: true, user: normalizedUser }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Google sign-in failed'
      return { success: false, error: message }
    }
  }

  const logout = () => {
    authApi.logout()
    localStorage.removeItem('user_data')
    setUser(null)
  }

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        isLoading, 
        isAuthenticated: !!user,
        googleLogin,
        logout 
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}