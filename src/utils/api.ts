import type { RefreshTokenRequest, RefreshTokenResponse, GoogleAuthRequest, GoogleAuthResponse } from '@/types'

type Params = Record<string, string | number | boolean | undefined | null>

const API_BASE_FALLBACK = import.meta.env.DEV ? "http://localhost:8000" : undefined
const API_URL = import.meta.env.VITE_API_URL || API_BASE_FALLBACK

if (!API_URL) {
  throw new Error("VITE_API_URL is not defined")
}

const API_BASE = new URL("/api/v1/", API_URL)

// Token management
export function getAuthToken() {
  return localStorage.getItem('auth_token')
}

export function getRefreshToken() {
  return localStorage.getItem('refresh_token')
}

export function setAuthToken(token: string) {
  localStorage.setItem('auth_token', token)
}

export function setRefreshToken(token: string) {
  localStorage.setItem('refresh_token', token)
}

export function clearAuthTokens() {
  localStorage.removeItem('auth_token')
  localStorage.removeItem('refresh_token')
  localStorage.removeItem('user_role')
}

function getAppRole() {
  return localStorage.getItem('user_role')
}

// Check if token is expired (with 60 second buffer)
export function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.exp * 1000 < Date.now() + 60000
  } catch {
    return true
  }
}

async function request<T = any>(method: string, path: string, body?: any, params?: Params, retry = true): Promise<T> {
  const normalizedPath = path.replace(/^\/+/, '')
  const url = new URL(normalizedPath, API_BASE)
  
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) {
        url.searchParams.set(k, String(v))
      }
    })
  }

  let token = getAuthToken()

  // Try to refresh token if it's expired
  if (token && isTokenExpired(token) && retry) {
    try {
      const refreshToken = getRefreshToken()
      if (refreshToken) {
        const refreshed = await authApi.refreshToken({ refresh_token: refreshToken })
        setAuthToken(refreshed.access_token)
        setRefreshToken(refreshed.refresh_token)
        token = refreshed.access_token
      }
    } catch {
      clearAuthTokens()
      window.location.href = '/login'
      throw new Error('Session expired. Please login again.')
    }
  }

  const res = await fetch(url.toString(), {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(getAppRole() ? { 'x-user-role': getAppRole() as string } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const text = await res.text()
    let payload: any = text
    try { payload = JSON.parse(text) } catch {}
    const err = new Error(payload?.message || res.statusText || 'Request failed')
    ;(err as any).status = res.status
    ;(err as any).body = payload
    throw err
  }

  const contentType = res.headers.get('content-type') || ''
  if (contentType.includes('application/json')) return res.json()
  return res.text() as Promise<T>
}

// Main API client
export const api = {
  get: <T = any>(path: string, params?: Params) => request<T>('GET', path, undefined, params),
  post: <T = any>(path: string, body?: any) => request<T>('POST', path, body),
  put: <T = any>(path: string, body?: any) => request<T>('PUT', path, body),
  patch: <T = any>(path: string, body?: any) => request<T>('PATCH', path, body),
  delete: <T = any>(path: string) => request<T>('DELETE', path),
}

// Auth-specific API endpoints
export const authApi = {
  googleAuth: (data: GoogleAuthRequest): Promise<GoogleAuthResponse> =>
    request<GoogleAuthResponse>('POST', 'auth/google', data, undefined, false),
  
  refreshToken: (data: RefreshTokenRequest): Promise<RefreshTokenResponse> => 
    request<RefreshTokenResponse>('POST', 'auth/refresh', data, undefined, false),
  
  logout: () => {
    clearAuthTokens()
  }
}

// Health check
export const healthApi = {
  check: (): Promise<{ status: string; timestamp: string; version: string }> => 
    request('GET', '../health', undefined, undefined, false)
}

export default api